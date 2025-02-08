/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022-2025 - https://www.igorski.nl
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
type RafCallback = () => void;

interface Cancelable {
    cancel: () => void;
    reset: () => void;
};

const rafCallbacks: RafCallback[] = [];

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
export const unblockedWait = ( timeToWait = 4 ): Promise<void> => {
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
 * @returns {Cancelable}
 */
export const cancelableCallback = ( callback: () => void, timeToWait = 250 ): Cancelable => {
    let timerId: number;
    const startTimeout = () => {
        timerId = window.setTimeout( callback, timeToWait ) as number;
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

/**
 * Execute given callback after an animation frame has fired.
 * This will debounce multiple invocations of the same callback if it
 * hasn't yet fired.
 */
export const rafCallback = ( callback: RafCallback ): void => {
    if ( rafCallbacks.includes( callback )) {
        return;
    }
    rafCallbacks.push( callback );
    window.requestAnimationFrame(() => {
        callback();
        rafCallbacks.splice( rafCallbacks.indexOf( callback ), 1 );
    });
};

/**
 * Convenience utility which can be used to debounce repeated calls to
 * heavy operations in case the preconfigured CPU budget is exceeded. This
 * can be used to prevent blocking the main thread.
 */
export class SmartExecutor {
    private executionBudgetMs;
    private startTime;

    constructor( executionBudgetMs = 1000 / 60, startTime = window.performance.now() ) {
        this.executionBudgetMs = executionBudgetMs;
        this.startTime = startTime;
    }

    /**
     * Await this function in between heavy operations to determine
     * whether there is still time to continue or whether to wait
     * for a single RAF to unblock UI rendering.
     * 
     * If there is no time left, this will await the next animationFrame
     * before resolving, otherwise this return immediately without stalling execution.
     */
    async waitWhenBusy(): Promise<void> {
        const now = window.performance.now();
        const elapsed = now - this.startTime;

        if ( elapsed > this.executionBudgetMs ) {
            return new Promise( resolve => {
                window.requestAnimationFrame( time => {
                    this.startTime = time;
                    resolve();
                });
            });
        }
    }
}
