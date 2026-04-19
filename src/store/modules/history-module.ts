/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2026 - https://www.igorski.nl
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
import type { Document } from "@/model/types/document";
import { forceProcess, flushQueue } from "@/model/factories/history-state-factory";
import type { UndoRedoState } from "@/model/factories/history-state-factory";
import { getRendererForLayer } from "@/model/factories/renderer-factory";
import { disposeResource } from "@/utils/resource-manager";

export const STATES_TO_SAVE = 99;

export interface DocumentHistory {
    undoManager: UndoManager;
    historyIndex: number; // used for reactivity (as undo manager isn't bound to Vue), the last saved state index
    // states can specify an optional list of Blob URLs associated with their undo/redo
    // operation. When such a state is popped from the available undo stack (because
    // new states have been added beyond the STATES_TO_SAVE limit), these Blob URLs
    // are revoked to free up memory.
    blobUrls: Map<number, string[]>;
    // the amount of states registered, this is not equal to the amount of states
    // available for undo (which is capped at STATES_TO_SAVE).
    stored: number;
};

export interface HistoryState {
    documents: Map<string, DocumentHistory>;
};

export const createHistoryState = ( props?: Partial<HistoryState> ): HistoryState => ({
    documents: new Map(),
    ...props,
});

const canUndo = ( history?: DocumentHistory ): boolean => history && history.historyIndex >= 0 && history.undoManager.hasUndo();
const canRedo = ( history?: DocumentHistory ): boolean => history && history.historyIndex < STATES_TO_SAVE && history.undoManager.hasRedo();

// a module to store states so the application can undo/redo changes
// made to a document. We do this by applying save and restore functions for
// individual changes made to a document. This is preferred over cloning
// entire document structures as this will consume a large amount of memory!

const HistoryModule: Module<HistoryState, any> = {
    state: createHistoryState(),
    getters: {
        canUndo( state: HistoryState, rootGetters: any ): boolean {
            if ( !rootGetters.activeDocument ) {
                return false;
            }
            return canUndo( state.documents.get( rootGetters.activeDocument.id ));
        },
        canRedo( state: HistoryState, rootGetters: any ): boolean {
            if ( !rootGetters.activeDocument ) {
                return false;
            }
            return canRedo( state.documents.get( rootGetters.activeDocument.id ));
        },
    },
    mutations: {
        registerDocument( state: HistoryState, activeDocument: Document ): void {
            const { id } = activeDocument;
            if ( state.documents.has( id )) {
                return;
            }
            const undoManager = new UndoManager();
            undoManager.setLimit( STATES_TO_SAVE );
            state.documents.set( id, {
                undoManager,
                historyIndex: -1,
                blobUrls: new Map(),
                stored: 0,
            });
        },
        /**
         * Store a state change inside the documents state history.
         * This should not be called directly but must be deferred through history-state-factory#enqueueState !
         */
        saveState( state: HistoryState, { id, undo, redo, resources = null }: UndoRedoState ): void {
            const history = state.documents.get( id );
            if ( !history ) {
                return;
            }
            history.undoManager.add({ undo, redo });
            history.historyIndex = history.undoManager.getIndex();
            ++history.stored;
            
            const storedIndex = history.stored;

            if ( storedIndex > STATES_TO_SAVE ) {
                // the minimum index that should still be available in the undo stack
                const minIndex = storedIndex - STATES_TO_SAVE;
                [ ...history.blobUrls.entries()].forEach(([ index, urls ]) => {
                    if ( index < minIndex ) {
                        ( urls as string[] ).forEach( url => disposeResource( url ));
                        history.blobUrls.delete( index );
                    }
                });
            }
            if ( Array.isArray( resources )) {
                history.blobUrls.set( storedIndex, resources );
            }
        },
        setHistoryIndex( state: HistoryState, { id, index }: { id: string, index: number }): void {
            state.documents.get( id )!.historyIndex = index;
        },
        clearHistory( state: HistoryState, id: string ): void {
            if ( !state.documents.has( id )) {
                return;
            }
            flushQueue();
            const history = state.documents.get( id )!;
            history.undoManager.clear();
            history.blobUrls.forEach( urlList => urlList.forEach( url => disposeResource( url )));
            history.blobUrls.clear();
            
            state.documents.delete( id );
        },
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
            const { id } = getters.activeDocument;
            return new Promise( resolve => {
                const history = state.documents.get( id );

                if ( canUndo( history )) {
                    history.undoManager.undo();
                    commit( "setHistoryIndex", {
                        id,
                        index: history.undoManager.getIndex()
                    });
                }
                resolve(); // always resolve, application should not break if history cannot be accessed
            });
        },
        /**
         * apply the next stored state
         */
        redo({ state, getters, commit }: ActionContext<HistoryState, any> ): Promise<void> {
            const { id } = getters.activeDocument;
            return new Promise( resolve => {
                const history = state.documents.get( id );

                if ( canRedo( history )) {
                    history.undoManager.redo();
                    commit( "setHistoryIndex", {
                        id,
                        index: history.undoManager.getIndex()
                    });
                }
                resolve(); // always resolve, application should not break if history cannot be accesse
            });
        }
    }
};
export default HistoryModule;
