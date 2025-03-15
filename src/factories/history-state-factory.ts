/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
import { type Store } from "vuex";
import { type BitMapperyState } from "@/store";

/**
 * a history state should provide undo and redo functions and an optional
 * list of resources (blob URLs) associated with the undo / redo actions.
 * Blob URLs will be revoked when the state is popped from the history stack to free memory.
 */
export type UndoRedoState = {
     undo: () => void;
     redo: () => void;
     resources?: string[];
};

const stateQueue      = new Map();
const ENQUEUE_TIMEOUT = 1000;

let timeout = 0;
let store: Store<BitMapperyState> | undefined;

export const initHistory = ( storeReference: Store<BitMapperyState> ): void => {
    store = storeReference;
}
export const hasQueue = (): boolean => queueLength() > 0;

export const queueLength = (): number => stateQueue.size;

export const flushQueue = (): void => {
    window.clearTimeout( timeout );
    stateQueue.clear();
};

// should only be called by history-module when performing undo
// this ensures that an enqueued state that is reverted within the ENQUEUE_TIMEOUT is restored
export const forceProcess = processQueue;

/**
 * Enqueue a state for addition in the history module. By enqueing, duplicate
 * calls for the same key with new state Objects are merged into a single state.
 *
 * @param {String} key unique identifier for this state
 * @param {UndoRedoState} undoRedoState
 */
export const enqueueState = ( key: string, undoRedoState: UndoRedoState ): void => {
    // new state is for the same property as the previously enqueued state
    // we can discard the previously enqueued states.redo in favour of this more actual one
    if ( stateQueue.has( key )) {
        const existing = stateQueue.get( key );
        existing.redo = undoRedoState.redo;
        if ( existing.resources && undoRedoState.resources ) {
            existing.resources.push( ...undoRedoState.resources );
        }
        return;
    }
    // there is an existing queue for a different property
    // process it immediately
    if ( hasQueue() ) {
        processQueue();
    }
    stateQueue.set( key, undoRedoState );
    window.setTimeout( processQueue, ENQUEUE_TIMEOUT );
};

/* internal methods */

function processQueue(): void {
    window.clearTimeout( timeout );
    stateQueue.forEach( undoRedoState => store?.commit( "saveState", undoRedoState ));
    stateQueue.clear();
}
