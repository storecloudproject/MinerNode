const expect  = require('chai').expect;
const { ClientChannel } = require('../index')
const Utils = require('../utils');
const Helpers = require('./test-helpers');

// Common objects used in the tests.
const options = {
    clientPrivateKey: Helpers.getRandomPrivateKey(),
    servers: Helpers.getRandomServerInfo(2),
    noiseEngine: 'noise-peer'
};

/**
 * Initialize client channel. Uses noise-peer engine.
 */
describe('Use Noise-Peer as the engine', function () {
    it('should send data to connected servers and receive corresponding responses', async () => {
        
        const clientChannel = new ClientChannel(options);
        
        let numberOfMessagesreceived = 0;
        // The callback function to receive data from connected servers.
        const readCallback = (data) => {
            console.log('\nClient for noise-peer received:'); console.log(data);
            numberOfMessagesreceived += 1;
        }
        
        // Result will be number of successful connections.
        const result = await clientChannel.initialize(readCallback);  
        
        // Send some data to connected servers in a loop 
        const send = (data) => {
            clientChannel.send(data);
        }
        
        Utils.interval(send, 100, 5, options.servers);
        
        // Wait for responses from connected servers. Wait little bit more than the 
        // above time to receive messages.
        setTimeout(() => {
                expect(numberOfMessagesreceived).to.equal(options.servers.length*5); 
                //clientChannel.close();
        }, 1000);
        
    });
})