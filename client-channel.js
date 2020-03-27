const net = require('net');
const path = require('path');
const jsonFile = require('jsonfile');
const Utils = require('./utils');

/**
 * Validation miners use the client channel to connect to one or more 
 * Storage miners. Validation miners also implement the server channel 
 * to gossip among themselves on the overall health of the STORE network.
 * This module implements the client channel.
 */

module.exports = class ClientChannel {
    /**
     * @param options - options to initialize the client channel.
     * For example: {
     *  clientPrivateKey: 'Private key of this client',
     *  servers: {
     *      [
     *        's1', 's2', ...
     *        // One or more servers to connect to. These server "ids" from
     *        // config/miner-public-keys.json where each id is the public key
     *        // of the server.
     *      ]
     *  }
     * }
     */

    constructor(options) {
        if (!options || Object.keys(options).length === 0) {
            throw new Error('options parameter is required to create the client channel.')
        }
        if (!options.clientPrivateKey) {
            throw new Error('options parameter should contain the private key for this client.')
        }
        if (!options.servers || !Array.isArray(options.servers) || options.servers.length === 0) {
            throw new Error('options parameter should list one or more servers to connect this client channel to.')
        }
               
        const self = this;
        
        // Make a copy of options to keep the originaldata unmutated.
        this.options = Utils.clone(options);
        this.options.servers = this.options.servers.map(server => {
            // Create servers as an array of objects, so we can add additional attributes later on.
            return {
                identifier: server
            }
        });
        
        this.supportedNoiseEngines = ['noise-stream', 'noise-peer'];
    
        // During development and testing, we will support specifying different noise engines.
        if (!this.options.noiseEngine || this.supportedNoiseEngines.indexOf(this.options.noiseEngine) === -1) {
           this.options.noiseEngine = this.supportedNoiseEngines[0];
        }
        
        // Get the public information about miners. This client will connect to one or more of other miners.
        this.minersPublicInfo = jsonFile.readFileSync(path.join(__dirname,'./config/miner-public-keys.json'));
        
        // Now validate that the options.servers has the right servers requested.
        this.options.servers.forEach(server => {
            const serverInfo = self.minersPublicInfo[server.identifier];
            if (!serverInfo) {
                throw new Error('Server ' + server.identifier + ' is not one of the available peers to connect to.');
            } 
            
            // Append all properties to the server object.
            server = Object.assign(server, serverInfo);
        })
                
        this.options.retryAttempts = 3;     // Number of retry attempts to reestablish connections.
        this.options.retryTimeoutInMS = 1000;   
        
        this.ready = false;     // The client channel will be ready when it connects to all servers.
    }
    
    /**
     * Initialize the client channel. Connect to all the servers specified.
     * For each server, a "socket" is returned, which is used to send encrypted 
     * requests and receive encrypted responses from the server.
     * @param readCallback - A callback function to receive data from connected servers.
     * @return - Number of successful connections. This should be same as options.servers.length
     * if all connections are successful. Otherwise it will be less than the number of 
     * servers requested.
     */
    async initialize(readCallback) {
        const self = this;
        
        /**
         * Helper function that connects to all servers requested. For each
         * server a Promise with {socket: <socket>, server: <server info>}
         * is returned. socket can be null, if connecting to the server fails.
         */
        
        const connectAll = async () => {
          return await Promise.all(self.options.servers.map(server => self.connect(server)));
        };
        
        try {
            const results = await connectAll();  
            let successfulConnections = 0;
            
            results.forEach((result, index) => {
                let matchingServer = self.options.servers[index];
                if (result.socket !== null) {
                    // We are not using results.filter() to retain the array indices
                    // to map to options.servers.
                    matchingServer.socket = result.socket;
                    
                    // Create Noise channel on the socket for encrypted message exchanges.
                    self.createNoiseChannel(matchingServer, readCallback);
                    
                    successfulConnections += 1;
                } else {
                    matchingServer.socket = null; 
                }
            })
            
            // Client is ready as long as a single server is connected to.
            this.ready = successfulConnections > 0;  
            return successfulConnections;
            
        } catch(e) {
            // Any exception is severe and affects the client functionality.
            throw (e);
        }
    }
    
    /**
     * Connects to a server with the specified address and port.
     * @param serverInfo - containing serverAddress and port as:
     * {
     *      serverAddress: '<server IP address>',
     *      serverPort: <server port number>
     * }
     * serverInfo may contain other details, but they are irrelevant for this API.
     * @return - A Promise with the connected socket if successful.
     */
    connect(serverInfo) {
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(serverInfo.serverPort, serverInfo.serverAddress, () => {
                resolve({socket: socket, server: serverInfo});
            }).on('error', (err) => {
                // It is possible that one or more servers are unreachable.
                resolve({socket: null, server: serverInfo});
            });
        });
    }
    
    /**
     * Returns the noise engine depending on the engine requested. This implementation
     * prevents creating unnecessary engines at runtime while being a little naive about the logic
     * to determine what engine to create.
     * @param serverInfo - The object containing server info and the socket already established.
     * @return the requested noise engine.
     */
    
    noiseEngine(serverInfo) {
        const supportedEngines = this.supportedNoiseEngines;
        const serverIdentifier = serverInfo.identifier;
        let noiseEngine;
        
        switch(this.options.noiseEngine) {
            case supportedEngines[0]:
                noiseEngine = new (require('./noise-stream-engine'))(serverInfo.socket, serverIdentifier);
            break;
            case supportedEngines[1]:
                noiseEngine = new (require('./noise-peer-engine'))(serverInfo.socket, serverIdentifier);
            break;
            default:
                noiseEngine = new (require('./noise-stream-engine'))(serverInfo.socket, serverIdentifier);
            break;
        }
        return noiseEngine;
    }
    
    /**
     * Creates a Noise channel on the socket for encrypted message exchanges between this 
     * client and connected servers.
     * @param serverInfo - The object containing server info and the socket already established.
     * @param readCallback - A callback function to receive data from connected server.
     */
    
    createNoiseChannel(serverInfo, readCallback) {
        const self = this;
        
        serverInfo.noiseClient = this.noiseEngine(serverInfo);
        
        serverInfo.noiseClient.createInitiatorChannel(readCallback);
        
        // It is possible that the server gets disconnected. So, add reconnect
        // logic to the socket.
        
        serverInfo.socket.on('close', () => {
            self.reconnect(serverInfo, readCallback);
        });
    }
    
    /**
     * Reconnects to a disconnected server. It is possible that the server is permanently down,
     * so the reconnect may fail.
     * @param serverInfo - The object containing server info to connect to.
     * @param readCallback - A callback function to receive data from connected server.
     */
    
    reconnect(serverInfo, readCallback) {
        const self = this;
        
        serverInfo.retryAttempts = 0;
        
        // Connect to the requested server.
        const connect = async () => {
          return await self.connect(serverInfo);
        };
        
        // Helper to retry connecting to the specified server.
        const retry = () => {
            if (++serverInfo.retryAttempts < self.options.retryAttempts) {
                Utils.interval(reestablish, (this.options.retryTimeoutInMS * serverInfo.retryAttempts * 2), 1);      
            }
        }
        
        // Reestablish the connection to the lost server. 
        const reestablish = async () => {
            // Remove all existing listeners from the current socket.
            if (serverInfo.socket !== null) {
                serverInfo.socket.removeAllListeners();
                serverInfo.socket = null;   
                serverInfo.noiseClient = null;
            }
            
            try {
                const result = await connect();  

                if (result.socket !== null) {
                    serverInfo.socket = result.socket;

                    // Create Noise channel on the socket for encrypted message exchanges.
                    self.createNoiseChannel(serverInfo, readCallback);
                } else {
                    // Connecting to server failed. Retry if we can.
                    retry();
                }
            } catch(e) {
                // An exception here shouldn't affect client functionality because this is 
                // retry, so we will attempt retrying again.
                retry();
            }
        }
        
        Utils.interval(reestablish, this.options.retryTimeoutInMS, 1);
    }
    
    /**
     * Sends the data to all connected servers.
     * @param jsonData - Data to send in JSON format.
     * This method is asynchronous, so the responses, if any, will be available in
     * the read callback supplied in the inititalization call.
     * The data is encrypted end to end.
     */
    
    send(jsonData) {
        this.options.servers.forEach(server => {
            if (server.socket !== null && server.noiseClient !== null) {
                // The channel may be temporarily set to null, if the client loses connection
                // to this server or initial connection attempts failed.
                server.noiseClient.send(jsonData);   
            }
        });
    }
    
    /*
     * Closes this client channel. Severes all connections to connected servers.
     */
    
    close() {
        this.options.servers.forEach(server => {
            if (server.socket !== null) {
                server.noiseClient.close();
                server.noiseClient = null;
                server.socket.end();
                server.socket.removeAllListeners();
                server.socket.destroy();
                server.socket = null;
            }
        });
    }
}
