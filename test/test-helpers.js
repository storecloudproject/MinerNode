const path = require('path');
const jsonFile = require('jsonfile');
const Utils = require('../utils');

/**
 * Helper functions used for testing.
 */

const Helpers = {
    /*
     * Given a count, this function fetches 
     */
    getRandomServerInfo: (count) => {
        const publicInfo = jsonFile.readFileSync(path.join(__dirname,'../config/miner-public-keys.json')),
              storageMiners = Object.keys(publicInfo).filter(key => {
                  return key.indexOf('s') === 0;
              });
        
        let randomServers = [];
        let index = 0;
        while (randomServers.length < count) {
            const r = index /* Utils.randomBetweenMinMax(0, storageMiners.length-1) */,
                  serverKey = storageMiners[r];
            
            if (randomServers.indexOf(serverKey) === -1) {
                randomServers.push(serverKey);
            }
            index++;
        }
        
        return randomServers;
    },
    
    /*
     * Return the private key for a random validation node.
     */
    
    getRandomPrivateKey: () => {
        const publicInfo = jsonFile.readFileSync(path.join(__dirname,'../config/miner-public-keys.json')),
              validationMiners = Object.keys(publicInfo).filter(key => {
                  return key.indexOf('v') === 0;
              });
    
        const r = Utils.randomBetweenMinMax(0, validationMiners.length-1),
                  serverKeyFile = validationMiners[r] +'.json';
    
        const minerInfo = jsonFile.readFileSync(path.join(__dirname,'../config/validation-miner-keys/', serverKeyFile));
        if (minerInfo) {
            return minerInfo.secretKey;
        }
        return null;
    }
}

module.exports = Helpers;