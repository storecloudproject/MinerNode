/**
 * Uses noise-protocol-stream as the encryption engine. The security characteristics
 * of these engines are still not fully determined, so we add support for multiple
 * engines for evaluation.
 *
 * See https://github.com/kapetan/noise-protocol-stream. This module uses
 * Noise_XX_25519_AESGCM_SHA256 as the Noise protocol.
 */

const noise = require('noise-protocol-stream');

module.exports = class NoiseStreamEngine {
    
    /**
     * @param socket - TCP socket on which the noise protocol will be built.
     * @param serverIdentifier - Any unique identifier -- "ip address:port" for example -- 
     * that the caller wants to supply. This identifier is used in the responses 
     * received from the connected server to identify the source of the messages.
     */
    
    constructor(socket, serverIdentifier) {
        this.socket = socket;
        this.serverIdentifier = serverIdentifier;
        this.noiseChannel = null;
    }
    
    /**
     * Creates a Noise channel on the socket for encrypted message exchanges.
     * @param readCallback - A callback function to receive data from the remote server.
     * Since each engine handles receiving data differently, the callback is passed to
     * the engine for proper handling of data received.
     */
    
    createInitiatorChannel(readCallback) {
        if (!readCallback || typeof readCallback !== "function") {
            throw new Error('A callback function is required to create initiator channel.')
        }
        
        const self = this;
        
        this.noiseChannel = noise({ initiator: true });
        this.noiseChannel.encrypt
          .pipe(self.socket)
          .pipe(self.noiseChannel.decrypt)
          .on('data', (data) => {
            // Pass the data to be read callback function with the serverAddress:port
            // key, so the callers know the server sending the response.
            const response = {
                from: self.serverIdentifier,
                // Response should be JSON.
                data: JSON.parse(data.toString())
            }
            readCallback(response);
          });
    }
    
    /**
     * Sends the data to server connected by the socket associated with this noise channel
     * @param jsonData - Data to send in JSON format.
     * This method is asynchronous, so the responses, if any, will be available in
     * the read callback supplied when the noise channel is created.
     * The data is encrypted end to end.
     */
    
    send(jsonData) {
        const stringData = JSON.stringify(jsonData);    // TO-DO.Use fast-stringify.
        this.noiseChannel.encrypt.write(stringData);   
    }
}