/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Returns a Promise that resolves when given timeToWait has expired.
 * The Promise is no-op in that it performs no action.
 *
 * As this uses setTimeout, it is guaranteed to free up the execution
 * stack of the main thread (for instance: to keep animations going during
 * heavy operations). As such you can use it in between heavy operations
 * to give the UI time to update.
 *
 * @param {Number=} timeToWait in milliseconds
 */
export const unblockedWait = ( timeToWait = 4 ) => {
    return new Promise( resolve => {
        window.setTimeout( resolve, timeToWait );
    });
};

/**
 * Creates an API to debounce execution to given callback by given time.
 * It is able to cancel existing executions or reset the timer on
 * repeated invocations. Note that it will not start the timer until
 * reset() is called.
 *
 * @param {Function} callback fn to execute when delay has expired
 * @param {Number=} timeToWait in milliseconds
 * @returns {{
 *     cancel : Function,
 *     reset  : Function
 * }}
 */
export const cancelableCallback = ( callback, timeToWait = 250 ) => {
    let timerId;
    const startTimeout = () => {
        timerId = window.setTimeout( callback, timeToWait );
    };
    const cancelTimeout = () => {
        window.clearTimeout( timerId );
    };
    return {
        cancel : cancelTimeout,
        reset  : () => {
            cancelTimeout();
            startTimeout();
        }
    };
};
