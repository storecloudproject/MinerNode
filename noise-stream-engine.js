/**
 * Uses noise-protocol-stream as the encryption engine. The security characteristics
 * of these engines are still not fully determined, so we add support for multiple
 * engines for evaluation.
 *
 * See https://github.com/kapetan/noise-protocol-stream. This module uses
 * Noise_XX_25519_AESGCM_SHA256 as the Noise protocol.
 */

const noise = require('noise-protocol-stream');
const NoiseEngine = require('./noise-engine');  // Base interface.

module.exports = class NoiseStreamEngine extends NoiseEngine {
    
    /**
     * See NoiseEngine for descriptions about parameters.
     */
    
    constructor(socket, serverIdentifier) {
        super(socket, serverIdentifier);
    }
    
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
    
    send(jsonData) {
        const stringData = JSON.stringify(jsonData);    // TO-DO.Use fast-stringify.
        this.noiseChannel.encrypt.write(stringData);   
    }
}