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
 * Tests constructing Client channel.
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
            const onlyServers = {
                servers: options.servers
            }
            new ClientChannel(onlyServers);
        };
        expect(clientChannel).to.throw(Error, 'options parameter should contain the private key for this client.');
    });
    
    it('should return error when servers list in options is not specified', () => {
        const clientChannel = function() {
            const onlyClientPrivateKey = {
                clientPrivateKey: options.clientPrivateKey
            }
            new ClientChannel(onlyClientPrivateKey)
        };
        expect(clientChannel).to.throw(Error, 'options parameter should list one or more servers to connect this client channel to.');
    });
    
    it('should return error when servers list in options is empty', () => {
        const clientChannel = function() {
            const emptyServerList = {
                clientPrivateKey: options.clientPrivateKey,
                servers: []
            }
            new ClientChannel(emptyServerList)
        };
        expect(clientChannel).to.throw(Error, 'options parameter should list one or more servers to connect this client channel to.');
    });
    
    it('should return error when servers list contains known servers', () => {
        const unknownServer = {
            clientPrivateKey: options.clientPrivateKey,
            servers: ['xyz', options.servers[1]]
        }
        const clientChannel = function() {
            new ClientChannel(unknownServer)
        };
        expect(clientChannel).to.throw(Error, 'Server ' + unknownServer.servers[0] + ' is not one of the available peers to connect to.');
    });
    
    it('should succeed when all parameters in options are specified', () => {
        const clientChannel = function() {
            new ClientChannel(options)
        };
        expect(clientChannel).to.not.throw(Error);
    });
})