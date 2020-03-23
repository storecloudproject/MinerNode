/**
 * All utilities.
 */

module.exports = class Utils {
    
    /** setInterval alternative -- https://www.thecodeship.com/web-development/
     * alternative-to-javascript-evil-setinterval/
     * @param func - Function to call after the timeout expires.
     * @param wait - Timeout in milliseconds.
     * @param times - Number of times the loop must be run. 
     *                times can be undefined to run it forever. If it is a number, 
     *                it is run for specified number of times. 
     *                If it is a function, the loop is executed if the function returns true. 
     * @param args - if passed, is passed on to the func being called. For simplicity, 
     *               args must be a JS object that func understands.
     */
    static interval(func, wait, times, args) {
        // Arrow functions don't work in this construct!
        let waitFn;
        if (Array.isArray(wait)) {
            // wait can be a [min, max] array to choose a random interval between the invocations.
            waitFn = () => {
                const r = Math.floor(Math.random() * (wait[1]-wait[0]+1) + wait[0]);
                //console.log('Interval: ' + r);
                return r;
            } 
        } else {
            waitFn = () => {
                return wait;
            }
        }
        
        let interv = function(w, t) {
            return () => {
                let run = false;
                
                if (typeof t === "function") {
                    run = t();
                } else if (typeof t === "undefined" || t-- > 0) {
                    run = true;
                }
                    
                if (run === true) {
                    setTimeout(interv, w());
                    try{
                        func.call(null, args);
                    }
                    catch(e){
                        t = 0;
                        throw e.toString();
                    }
                }
            };
        } (waitFn, times);

        setTimeout(interv, waitFn());
    }
    
    // Produce a random number between a min and max threshold.
    static randomBetweenMinMax(min, max) {
        if (min > max) {
            const other = min;
            min = max;
            max = other;
        }
        return Math.floor(Math.random() * (max-min+1) + min);
    }
    
    static clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}