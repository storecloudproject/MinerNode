const expect  = require('chai').expect;
const ClientChannel = require('../client-channel')
const Utils = require('../utils');

// Common objects used in the tests.
const options = {
    clientPrivateKey: 'IduDjH3fbAEhBEHQcZS3oIyILb/EPA29xThHfB/vmB0GYu0jE79nk6U7ZZ13qxUX99WTAU4iQFRBOdfuIaf11Q==',
    servers: [
        {
            serverAddress: 'localhost',
            serverPort: 2021
        },
        {
            serverAddress: 'localhost',
            serverPort: 2022
        }
    ]
};

/**
 * Construct Client channel.
 */
describe('Creating client channel', function () {
    it('should return error when client channel is created with no options', () => {
        const clientChannel = function() {
            new ClientChannel()
        };
        expect(clientChannel).to.throw(Error, 'options parameter is required to create the client channel.');
    });
    
    it('should return error when client channel is created with empty options', () => {
        const clientChannel = function() {
            new ClientChannel({})
        };
        expect(clientChannel).to.throw(Error, 'options parameter is required to create the client channel.');
    });
    
    it('should return error when options doesn\'t contain clientPrivateKey', () => {
        const clientChannel = function() {
            new ClientChannel({
                servers: [
                    {
                        serverAddress: 'localhost',
                        serverPort: 2021
                    }
                ]
            })
        };
        expect(clientChannel).to.throw(Error, 'options parameter should contain the private key for this client.');
    });
    
    it('should return error when servers list in options is not specified', () => {
        const clientChannel = function() {
            new ClientChannel({
                clientPrivateKey: 'IduDjH3fbAEhBEHQcZS3oIyILb/EPA29xThHfB/vmB0GYu0jE79nk6U7ZZ13qxUX99WTAU4iQFRBOdfuIaf11Q=='
            })
        };
        expect(clientChannel).to.throw(Error, 'options parameter should list one or more servers to connect this client channel to.');
    });
    
    it('should return error when servers list in options is empty', () => {
        const clientChannel = function() {
            new ClientChannel({
                clientPrivateKey: 'IduDjH3fbAEhBEHQcZS3oIyILb/EPA29xThHfB/vmB0GYu0jE79nk6U7ZZ13qxUX99WTAU4iQFRBOdfuIaf11Q==',
                servers: []
            })
        };
        expect(clientChannel).to.throw(Error, 'options parameter should list one or more servers to connect this client channel to.');
    });
    
    it('should succeed when all parameters in options are specified', () => {
        const clientChannel = function() {
            new ClientChannel({
                clientPrivateKey: 'IduDjH3fbAEhBEHQcZS3oIyILb/EPA29xThHfB/vmB0GYu0jE79nk6U7ZZ13qxUX99WTAU4iQFRBOdfuIaf11Q==',
                servers: [
                    {
                        serverAddress: 'localhost',
                        serverPort: 2021
                    }
                ]
            })
        };
        expect(clientChannel).to.not.throw(Error);
    });
})

/**
 * Initialize client channel.
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
            //console.log(data);
            numberOfMessagesreceived += 1;
        }
        
        // Result will be number of successful connections.
        const result = await clientChannel.initialize(readCallback);  
        
        // Send some data to connected servers in a loop 
        const send = (data) => {
            clientChannel.send(data);
        }
        
        Utils.interval(send, 100, 10, options.servers);
        
        // Wait for responses from connected servers. Wait little bit more than the 
        // above time to receive messages.
        setTimeout(() => {
                expect(numberOfMessagesreceived).to.equal(options.servers.length*10); 
        }, 2000);
        
    });
})