/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
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
import UndoManager from "undo-manager";
import { forceProcess, flushQueue } from "@/factories/history-state-factory";

const STATES_TO_SAVE = 99;

// a module to store states so the application can undo/redo changes
// made to the song. We do this by applying save and restore functions for
// individual changes made to a song. This is preferred over cloning
// entire song structures as this will consume a large amount of memory!
// by using Vue.set() and Vue.delete() in the undo/redo functions reactivity
// will be retained.

const module = {
    state: {
        undoManager: new UndoManager(),
        historyIndex: -1    // used for reactivity (as undo manager isn"t bound to Vue)
    },
    getters: {
        canUndo( state ) {
            return state.historyIndex >= 0 && state.undoManager.hasUndo();
        },
        canRedo( state ) {
            return state.historyIndex < STATES_TO_SAVE && state.undoManager.hasRedo();
        },
        amountOfStates( state ) {
            return state.historyIndex + 1;
        }
    },
    mutations: {
        /**
         * Store a state change inside the history.
         */
        saveState( state, { undo, redo }) {
            if ( process.env.NODE_ENV === "development" ) {
                if ( typeof undo !== "function" || typeof redo !== "function" ) {
                    throw new Error( "cannot store a state without specifying valid undo and redo actions" );
                }
            }
            state.undoManager.add({ undo, redo });
            state.historyIndex = state.undoManager.getIndex();
        },
        setHistoryIndex( state, value ) {
            state.historyIndex = value;
        },
        /**
         * clears entire history
         */
        resetHistory( state ) {
            flushQueue();
            state.undoManager.clear();
            state.historyIndex = -1;
        }
    },
    actions: {
        /**
         * apply the previously stored state
         */
        undo({ state, getters, commit }) {
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
        redo({ state, getters, commit }) {
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

export default module;

/* initialization */

module.state.undoManager.setLimit( STATES_TO_SAVE );
