module.exports = class Utils {
    /**
     * Clone an object.
     */
    static clone (obj) {
        let _obj = {}
        for (var k in obj) {
            if (Object.hasOwnProperty.call(obj, k)) {
                _obj[k] = obj[k];
            }
        }
        return _obj;
    }
}
