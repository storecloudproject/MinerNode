const expect  = require('chai').expect;
const { ClientChannel } = require('../index')
const Utils = require('../utils');
const Helpers = require('./test-helpers');

// Common objects used in the tests.
const options = {
    clientPrivateKey: Helpers.getRandomPrivateKey(),
    servers: Helpers.getRandomServerInfo(2)
};

/**
 * Initialize client channel. Uses the default noise engine (noise-stream).
 */
describe('Initialize client channel', function () {
    it('should succeed when the client channel successfully connects to at least one server', async () => {
        const clientChannel = new ClientChannel(options);
        
        // The callback function to receive data from connected servers.
        const readCallback = (data) => {
            console.log('Callback received:'); console.log(data);
        }
        
        // Result will be number of successful connections.
        const result = await clientChannel.initialize(readCallback);  
        expect(result).to.be.above(0);  // At least one server is connected.
    });
    
    it('should send data to connected servers and receive corresponding responses', async () => {
        const clientChannel = new ClientChannel(options);
        
        let numberOfMessagesreceived = 0;
        // The callback function to receive data from connected servers.
        const readCallback = (data) => {
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
                clientChannel.close();
        }, 1000);
        
    });
    
    it('should be able to create multiple client channels connected to same servers', async () => {
        
        class Client {
            constructor(id) {
                this.id = id;
                this.clientChannel = new ClientChannel(options);
                this.messagesReceived = 0;
            }
            
            async init() {
                const self = this;
                const readCallback = (data) => {
                    console.log('\nClient ' + self.id + ':'); console.log(data);
                    self.messagesReceived += 1;
                }
                const result = await this.clientChannel.initialize(readCallback); 
                return result;
            }
            
            write(message) {
                this.clientChannel.send(message);
            }
            
            get messageCount() {
                return this.messagesReceived;
            }
            
            close() {
                this.clientChannel.close();
            }
        }
        
        const clients = [new Client(1), new Client(2)];
        
        clients.forEach(async (c) => {
            await c.init();
            c.write(options.servers);
        })
        
        // Wait for responses from connected servers.
        let totalMessages = 0;
        
        setTimeout(() => {
            clients.forEach((c) => {
                totalMessages += c.messageCount;
                c.close();
            })
            
            expect(totalMessages).to.equal(options.servers.length*clients.length); 
        }, 1000);
        
    });
    
})