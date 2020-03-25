const expect  = require('chai').expect;
const fs = require('fs');
const GenerateMinerKeys = require('../misc/generate-miner-keys');
const Utils = require('../utils');
const path = require('path');

/**
 * Test generating keys for miners. The key files should be created in ../config folder.
 */
describe('Generate keys for validation and storage miners', function () {
    it('should create JSON files with keys for validation and storage miners', () => {
        const minerKeys = new GenerateMinerKeys();
        
        const checkForFiles = () => {
            expect(fs.existsSync(path.join(__dirname,'../config/validation-miner-keys.json'))).to.be.true;
            expect(fs.existsSync(path.join(__dirname,'../config/storage-miner-keys.json'))).to.be.true;
            expect(fs.existsSync(path.join(__dirname,'../config/miner-public-keys.json'))).to.be.true;
        };
        
        Utils.interval(checkForFiles, 1000, 1);
        
    });
    
});