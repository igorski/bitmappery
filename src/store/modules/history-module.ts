/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
// @ts-expect-error UndoManager has no types
import UndoManager from "undo-manager";
import type { ActionContext, Module } from "vuex";
import { forceProcess, flushQueue } from "@/factories/history-state-factory";
import type { UndoRedoState } from "@/factories/history-state-factory";
import { getRendererForLayer } from "@/factories/renderer-factory";
import { disposeResource } from "@/utils/resource-manager";

export const STATES_TO_SAVE = 99;

export interface HistoryState {
    undoManager: UndoManager;
    historyIndex: number; // used for reactivity (as undo manager isn't bound to Vue)
    // states can specify an optional list of Blob URLs associated with their undo/redo
    // operation. When such a state is popped from the avilable undo stack (because
    // new states have been added beyond the STATES_TO_SAVE limit), these Blob URLs
    // are revoked to free up memory.
    blobUrls: Map<number, string[]>;
    // the amount of states registered, this is not equal to the amount of states
    // available for undo (which is capped at STATES_TO_SAVE).
    stored: number;
};

export const createHistoryState = ( props?: Partial<HistoryState> ): HistoryState => ({
    undoManager: null, // pass explicitly in props
    historyIndex: -1,
    blobUrls: new Map(),
    stored: 0,
    ...props,
});

// a module to store states so the application can undo/redo changes
// made to a document. We do this by applying save and restore functions for
// individual changes made to a document. This is preferred over cloning
// entire document structures as this will consume a large amount of memory!

const HistoryModule: Module<HistoryState, any> = {
    state: createHistoryState({ undoManager: new UndoManager() }),
    getters: {
        canUndo( state: HistoryState ): boolean {
            return state.historyIndex >= 0 && state.undoManager.hasUndo();
        },
        canRedo( state: HistoryState ): boolean {
            return state.historyIndex < STATES_TO_SAVE && state.undoManager.hasRedo();
        },
        amountOfStates( state: HistoryState ): number {
            return state.historyIndex + 1;
        },
    },
    mutations: {
        /**
         * Store a state change inside the history.
         */
        saveState( state: HistoryState, { undo, redo, resources = null }: UndoRedoState ): void {
            state.undoManager.add({ undo, redo });
            state.historyIndex = state.undoManager.getIndex();
            ++state.stored;

            const storedIndex = state.stored;

            if ( storedIndex > STATES_TO_SAVE ) {
                // the minimum index that should still be available in the undo stack
                const minIndex = storedIndex - STATES_TO_SAVE;
                [ ...state.blobUrls.entries()].forEach(([ index, urls ]) => {
                    if ( index < minIndex ) {
                        ( urls as string[] ).forEach( url => disposeResource( url ));
                        state.blobUrls.delete( index );
                    }
                });
            }

            if ( Array.isArray( resources )) {
                state.blobUrls.set( storedIndex, resources );
            }
        },
        setHistoryIndex( state: HistoryState, value: number ): void {
            state.historyIndex = value;
        },
        /**
         * clears entire history
         */
        resetHistory( state: HistoryState ): void {
            flushQueue();
            state.undoManager.clear();
            state.historyIndex = -1;
            state.stored = 0;
            state.blobUrls.forEach( urlList => urlList.forEach( url => disposeResource( url )));
            state.blobUrls.clear();
        }
    },
    actions: {
        /**
         * apply the previously stored state
         */
        async undo({ state, getters, commit }: ActionContext<HistoryState, any> ): Promise<void> {
            // first: if there was a renderer in the painting state, store its deferred state immediately
            const drawableRenderer = getters.activeLayer && getRendererForLayer( getters.activeLayer );
            if ( drawableRenderer ) {
                await drawableRenderer.storePaintState();
            }
            forceProcess();
            return new Promise( resolve => {
                if ( getters.canUndo ) {
                    state.undoManager.undo();
                    commit( "setHistoryIndex", state.undoManager.getIndex());
                }
                resolve(); // always resolve, application should not break if history cannot be accessed
            });
        },
        /**
         * apply the next stored state
         */
        redo({ state, getters, commit }: ActionContext<HistoryState, any> ): Promise<void> {
            return new Promise( resolve => {
                if ( getters.canRedo ) {
                    state.undoManager.redo();
                    commit( "setHistoryIndex", state.undoManager.getIndex() );
                }
                resolve(); // always resolve, application should not break if history cannot be accesse
            });
        }
    }
};

export default HistoryModule;

/* initialization */

// @ts-expect-error undoManager has no types
HistoryModule.state.undoManager.setLimit( STATES_TO_SAVE );
