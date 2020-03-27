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
const fs = require("fs");
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
        
        this._VALIDATION_MINER_PREFIX = 'v';
        this._STORAGE_MINER_PREFIX = 's';
        
        this.publicKeys = {};   // Captures public information about miners.
        
        this.generateKeysForValidationMiners()
        this.generateKeysForStorageMiners();
        this.publishPublicKeys();
    }
    
    /**
     * Helper function to generate specified number of keys.
     * @param count - Number of keys to generate.
     * @param startPortNumber - Starting port number.
     * @param minerPrefix - "v" for validation miner and "s" for storage miner.
     */

    generateKeys(count, startPortNumber, minerPrefix) {
        let keys = {};
        const validPrefixes = [this._VALIDATION_MINER_PREFIX, this._STORAGE_MINER_PREFIX];
        
        if (!minerPrefix || validPrefixes.indexOf(minerPrefix) === -1) {
            minerPrefix = validPrefixes[0];     // This choice actually doesn't matter.
        }
        
        for (let k = 0; k < count; k++) {
            const keypair = noisePeer.keygen(),
                  key = {
                    serverAddress: 'localhost',
                    serverPort: (startPortNumber + k),
                    publicKey: keypair.publicKey.toString('hex'), 
                    secretKey: keypair.secretKey.toString('hex')
                  }
            keys[minerPrefix+k] = key;    // public key is used as the server identifier.
        }
        
        return keys;
    }

    /**
     * Generate keys for validation miners. A separate key file is generated for
     * each miner.
     */

    generateKeysForValidationMiners() {
        const keys = this.generateKeys(Config.setup._NUM_OF_VALIDATION_MINERS_PER_MARKET*Config.setup._NUM_OF_MARKETS, 
                                 this._VALIDATION_MINER_START_PORT, this._VALIDATION_MINER_PREFIX);
        const parentFolder = path.join(__dirname, '../config/validation-miner-keys/');

        // First, delete any existing key files created.
        this.deleteExistingKeyFiles(parentFolder);
        
        // Create a separate key file for each miner. The public key is used as the filename.
        Object.keys(keys).forEach(key => {
            const file = path.join(parentFolder + key + '.json');
            jsonFile.writeFile(file, keys[key], {flag: 'w'}, (err) => {
                if (err) {
                    throw (err);
                }
                //console.log(file + ' is created successfully.');
            })
        })

        // Remove the secret key for each miner and gather the public information.
        this.publicKeys = Object.assign(this.publicKeys, this.preparePublicKeys(keys));

    }

    /**
     * Generate keys for storage miners.
     */
    generateKeysForStorageMiners() {
        const keys = this.generateKeys(Config.setup._NUM_OF_STORAGE_MINERS_PER_MARKET*Config.setup._NUM_OF_MARKETS, 
                                 this._STORAGE_MINER_START_PORT, this._STORAGE_MINER_PREFIX);
        const parentFolder = path.join(__dirname, '../config/storage-miner-keys/');

        // First, delete any existing key files created.
        this.deleteExistingKeyFiles(parentFolder);

        // Create a separate key file for each miner. The public key is used as the filename.
        Object.keys(keys).forEach(key => {
            const file = path.join(parentFolder + key + '.json');
            jsonFile.writeFile(file, keys[key], {flag: 'w'}, (err) => {
                if (err) {
                    throw (err);
                }
                //console.log(file + ' is created successfully.');
            })
        })

        // Remove the secret key for each miner and gather the public information.
        this.publicKeys = Object.assign(this.publicKeys, this.preparePublicKeys(keys));
    }

    /**
     * Filters out private keys to use the public key information for 
     * the specified miner type.
     * @param keys - Generated keys for miners.
     * @return - Dictionary of public information about the miner.
     */
    
    preparePublicKeys(keys) {
        let publicKeys = {};
        
        Object.keys(keys).forEach(key => {
            let copied = Utils.clone(keys[key]);
            delete copied.secretKey;
            copied.identifier = key;    // Add the miner identifier into the miner public info.
            publicKeys[key] = copied;
        });
        
        return publicKeys;
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
            //console.log(file + ' file is created successfully.');
        })
    }
    
    /**
     * Deletes existing key files, if any, from the folder specified. Since this utility
     * may be called multiple times, this cleanup is used to create a fresh set of 
     * key files.
     * All files in the parentFolder will be deleted.
     * @param parentFolder - Folder containing the key files.
     */
    
    deleteExistingKeyFiles(parentFolder) {
        if (!fs.existsSync(parentFolder)) {
            return;
        }

        const files = fs.readdirSync(parentFolder);
        for (let f = 0; f < files.length; f++) {
            const filename = path.join(parentFolder, files[f]);
            const stat = fs.statSync(filename);

            if (stat.isDirectory()) {
                this.deleteExistingKeyFiles(filename);
            } else if (filename !== '.' && filename !== '..') {
                fs.unlinkSync(filename);
            }
        }
    }
}

