/**
 * Generates private and public keys for Validation and Storage miners.
 * In production environment, each miner generates their own keys privately
 * (may even be using Hardware Security Modules or HSMs) and will NOT be 
 * using this tool. This is used for testing purposes.
 *
 * The "public" keys, as the name suggests, are published for other miners 
 * to connect their clients to. The public keys are used to along with
 * Noise_XX pattern to guarantee that both the client and server validate
 * each other's keys before establishing secure channels between them.
 */

const jsonFile = require('jsonfile');
const noisePeer = require('noise-peer');
const Config = require('../config/config');
const path = require('path');
const Utils = require('../utils');

/*
 * For testing purposes, we assume validation and storage miners nodes
 * are run on localhost. Validation miner ports start from 2020 and
 * storage miner ports start from 4040.
 */

module.exports = class GenerateMinerKeys {
    constructor() {
        this._VALIDATION_MINER_START_PORT = 2020;
        this._STORAGE_MINER_START_PORT = 4040;
        this.publicKeys = {validationMiners: [], storageMiners: []};
        
        this.generateKeysForValidationMiners()
        this.generateKeysForStorageMiners();
        this.publishPublicKeys();
    }
    
    /**
     * Helper function to generate specified number of keys.
     * @param count - Number of keys to generate.
     * @param startPortNumber - Starting port number.
     */

    generateKeys(count, startPortNumber) {
        let keys = [];
        for (let k = 0; k < count; k++) {
            const keypair = noisePeer.keygen(),
                  key = {
                    serverAddress: 'localhost',
                    serverPort: (startPortNumber + k),
                    publicKey: keypair.publicKey.toString('hex'), 
                    secretKey: keypair.secretKey.toString('hex')
                  }
            keys.push(key);
        }
        return keys;
    }

    /**
     * Generate keys for validation miners.
     */

    generateKeysForValidationMiners() {
        const file = path.join(__dirname, '../config/validation-miner-keys.json');
        const keys = this.generateKeys(Config.setup._NUM_OF_VALIDATION_MINERS_PER_MARKET*Config.setup._NUM_OF_MARKETS, 
                                 this._VALIDATION_MINER_START_PORT);

        jsonFile.writeFile(file, keys, {flag: 'w'}, (err) => {
            if (err) {
                console.log('Creating ' + file + ' failed!')
                console.log(__dirname);
                throw (err);
            }
            console.log(file + ' file is created successfully.');
        })

        this.publicKeys.validationMiners = keys.map(key => {
            // Remove secret keys from public information.
            var copied = Utils.clone(key);
            delete copied.secretKey;
            return copied;
        })
    }

    /**
     * Generate keys for storage miners.
     */
    generateKeysForStorageMiners() {
        const file = path.join(__dirname, '../config/storage-miner-keys.json');
        const keys = this.generateKeys(Config.setup._NUM_OF_STORAGE_MINERS_PER_MARKET*Config.setup._NUM_OF_MARKETS, 
                                 this._STORAGE_MINER_START_PORT);

        jsonFile.writeFile(file, keys, {flag: 'w'}, (err) => {
            if (err) throw (err);
            console.log(file + ' file is created successfully.');
        })

        this.publicKeys.storageMiners = keys.map(key => {
            // Remove secret keys from public information.
            var copied = Utils.clone(key);
            delete copied.secretKey;
            return copied;
        })
    }

    /**
     * Create public key information.
     */ 
    
    /**
     * Generate keys for storage miners.
     */
    publishPublicKeys() {
        const file = path.join(__dirname, '../config/miner-public-keys.json');
        jsonFile.writeFile(file, this.publicKeys, {flag: 'w'}, (err) => {
            if (err) throw (err);
            console.log(file + ' file is created successfully.');
        })
    }
}

