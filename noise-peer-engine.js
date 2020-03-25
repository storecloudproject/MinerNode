/**
 * Uses noise-peer as the encryption engine.This implementation allows 
 * specifying different handshaking patterns unlike noise-protocol-stream,
 * which allows only Noise_XX pattern. While this pattern is what we want
 * being able to experiment with other patterns is beneficial.
 *
 * See https://github.com/kapetan/noise-protocol-stream. This module uses
 * Noise_*_25519_XChaChaPoly_BLAKE2b as the Noise protocol where * = XX
 * by default.
 */

const noise = require('noise-peer');
const NoiseEngine = require('./noise-engine');  // Base interface.
const pump = require('pump');

module.exports = class NoisePeerEngine extends NoiseEngine {
    
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
        
        this.noiseChannel = noise(this.socket, true);   // Initiator.
        this.noiseChannel.on('data', (data) => {
            const response = {
                from: self.serverIdentifier,
                // Response should be JSON.
                data: JSON.parse(data.toString())
            }
            readCallback(response);
        })
    }
    
    send(jsonData) {
        const stringData = JSON.stringify(jsonData);    // TO-DO.Use fast-stringify.
        this.noiseChannel.write(stringData);   
    }
    
    close() {
        this.noiseChannel.end();
    }
}