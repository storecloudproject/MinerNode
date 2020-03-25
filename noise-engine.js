/**
 * Base interface for various Noise protocol engines that can be used for
 * secure p2p communication between Miner nodes.
 */

const Utils = require('./utils');

/** 
 * Noise engine interface.
 */
module.exports = class NoiseEngine {
    
    /**
     * @param socket - TCP/UTP socket on which the noise protocol will be built.
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
     * The channel is created from message initiator's (client) perspective.
     * Noise_XX protocol is recommended, although we need to investigate other patterns. 
     * See https://noiseprotocol.org/noise.html#interactive-handshake-patterns-fundamental
     * @param readCallback - A callback function to receive data from the remote server.
     * Since each engine handles receiving data differently, the callback is passed to
     * the engine for proper handling of data received.
     */
    
    createInitiatorChannel(readCallback) {
        Utils.notImplemented();
    }
    
    /**
     * Sends the data to server connected by the socket associated with this noise channel
     * @param jsonData - Data to send in JSON format.
     * This method is asynchronous, so the responses, if any, will be available in
     * the read callback supplied when the noise channel is created.
     * The data is encrypted end to end.
     */
    
    send(jsonData) {
        Utils.notImplemented();   
    }
}