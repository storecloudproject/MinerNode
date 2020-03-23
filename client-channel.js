const net = require('net');
const noise = require('noise-protocol-stream');
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
     *        {
     *          serverAddress: '<IP address of the server>',
     *          serverPort: <Port number>
     *        }
     *        // One or more servers to connect to.
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
        
        // Make a copy of options to keep the originaldata unmutated.
        this.options = Utils.clone(options);
        this.options.retryAttempts = 3;     // Number of retry attempts to reestablish connections.
        this.options.retryTimeoutInMS = 1000;   
        
        this.connectedServers = [];     // Holds the list of servers with successful connections.
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

                    // Handy list of servers send/receive data.
                    self.connectedServers.push(matchingServer);
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
     * Creates a Noise channel on the socket for encrypted message exchanges between this 
     * client and connected servers.
     * @param serverInfo - The object containing server info and the socket already established.
     * @param readCallback - A callback function to receive data from connected server.
     */
    
    createNoiseChannel(serverInfo, readCallback) {
        const self = this;
        
        serverInfo.noiseClient = noise({ initiator: true });
        serverInfo.noiseClient.encrypt
          .pipe(serverInfo.socket)
          .pipe(serverInfo.noiseClient.decrypt)
          .on('data', (data) => {
            // Pass the data to be read callback function with the serverAddress:port
            // key, so the callers know the server sending the response.
            const response = {
                from: (serverInfo.serverAddress + ':' + serverInfo.serverPort),
                // Response should be JSON.
                data: JSON.parse(data.toString())
            }
            readCallback(response);
          });
        
        // It is possible that the server gets disconnected. So, add reconnect
        // logic to the socket.
        
        serverInfo.socket.on('close', () => {
            self.reconnect(serverInfo, readCallback);
        })

        serverInfo.socket.on('end', () => {
            self.reconnect(serverInfo, readCallback);
        })
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
        const self = this;
        const stringData = JSON.stringify(jsonData);    // TO-DO.Use fast-stringify.
        this.connectedServers.forEach(server => {
            if (server.socket !== null) {
                // Socket may be temporarily set to null, if the client loses connection
                // to this server.
                server.noiseClient.encrypt.write(stringData);   
            }
        });
    }
}
