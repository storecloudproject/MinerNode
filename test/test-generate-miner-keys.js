const expect  = require('chai').expect;
const fs = require('fs');
const GenerateMinerKeys = require('../misc/generate-miner-keys');
const Utils = require('../utils');
const Config = require('../config/config');
const path = require('path');
const jsonFile = require('jsonfile');

/**
 * Test generating keys for miners. The key files should be created in ../config folder.
 */
describe('Generate keys for validation and storage miners', function () { 
    this.timeout(4000);
    
    it('should read the public information about miners', (done) => {
        const minerKeys = new GenerateMinerKeys();
        
        const checkForFiles = () => {
            const publicInfo = jsonFile.readFileSync(path.join(__dirname,'../config/miner-public-keys.json')),
                  totalExpectedEntries = Config.setup._NUM_OF_MARKETS * (Config.setup._NUM_OF_STORAGE_MINERS_PER_MARKET + 
                                                                    Config.setup._NUM_OF_VALIDATION_MINERS_PER_MARKET),
                  actualEntries = Object.keys(publicInfo).length;
            
            expect(actualEntries).to.equal(totalExpectedEntries);
            done();
        };
        // This timeout allows creating 170+ key files.
        Utils.interval(checkForFiles, 2000, 1);
        
    });
    
});