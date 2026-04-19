import { it, describe, expect, beforeEach, afterAll, vi } from "vitest";
import { mockZCanvas } from "../../mocks";
import DocumentFactory from "@/model/factories/document-factory";
import store, { createHistoryState, type HistoryState, STATES_TO_SAVE } from "@/store/modules/history-module";
const { getters, mutations, actions }  = store;

let mockUpdateFn: ( fnName: string, ...args: any[] ) => void;
vi.mock( "@/model/factories/history-state-factory", () => ({
    forceProcess: (...args: any[]) => mockUpdateFn?.( "forceProcess", ...args ),
    flushQueue: (...args: any[]) => mockUpdateFn?.( "flushQueue", ...args )
}));
vi.mock( "@/utils/resource-manager", () => ({
    "disposeResource": (...args: any[]) => mockUpdateFn?.( "disposeResource", ...args ),
}));
mockZCanvas();

describe( "History State module", () => {
    const noop = () => {};
    let commit = vi.fn();
    let state: HistoryState;
    const document1 = DocumentFactory.create();
    const document2 = DocumentFactory.create();

    beforeEach( () => {
        state = createHistoryState();
    });

    afterAll(() => {
        vi.clearAllMocks();
    });

    describe( "getters", () => {
        it( "should know when it can undo an action", async () => {
            mutations.registerDocument( state, document1 ); // register document in history

            expect(
                getters.canUndo(
                    state, { activeDocument: undefined }, {}, {}
                )
            ).toBe( false ); // expected no undo to be available when there is no active Document

            expect(
                getters.canUndo(
                    state, { activeDocument: document1 }, {}, {}
                )
            ).toBe( false ); // expected no undo to be available when active Document hasn't saved states yet
            
            mutations.saveState( state, { id: document1.id, undo: noop, redo: noop });
            
            expect(
                getters.canUndo(
                    state, { activeDocument: document1 }, {}, {}
                )
            ).toBe( true ); // expected undo to be available after addition of action
            
            // @ts-expect-error Not all constituents of type 'Action<HistoryState, any>' are callable.
            await actions.undo({ state, commit, getters: { activeDocument: document1 }});
            
            expect(
                getters.canUndo(
                    state, { activeDocument: document1 }, {}, {}
                )
            ).toBe( false ); // expected no undo to be available after having undone all actions
        });

        it( "should know when it can redo an action", async () => {
            mutations.registerDocument( state, document1 ); // register document in history

            expect(
                getters.canRedo(
                    state, { activeDocument: undefined }, {}, {}
                )
            ).toBe( false ); // expected no redo to be available when there is no active Document

            expect(
                getters.canRedo(
                    state, { activeDocument: document1 }, {}, {}
                )
            ).toBe( false ); // expected no redo to be available when active Document hasn't saved states yet
            
            mutations.saveState( state, { id: document1.id, undo: noop, redo: noop });
            
            expect(
                getters.canRedo(
                    state, { activeDocument: document1 }, {}, {}
                )
            ).toBe( false ); // expected no redo to be available after addition of action
            
            // @ts-expect-error Not all constituents of type 'Action<HistoryState, any>' are callable.
            await actions.undo({ state, commit, getters: { activeDocument: document1 }});
            
            expect(
                getters.canRedo(
                    state, { activeDocument: document1 }, {}, {}
                )
            ).toBe( true ); // expected redo to be available after having undone actions
            
            // @ts-expect-error Not all constituents of type 'Action<HistoryState, any>' are callable.
            await actions.redo({ state, commit, getters: { activeDocument: document1 }});

            expect(
                getters.canRedo(
                    state, { activeDocument: document1 }, {}, {}
                )
            ).toBe( false ); // expected no redo to be available after having redone all actions
        });

        it( "should know when it can undo an action when switching between Documents", async () => {
            mutations.registerDocument( state, document1 );
            mutations.registerDocument( state, document2 );

            await mutations.saveState( state, { id: document1.id, undo: noop, redo: noop });

            expect( getters.canUndo( state, { activeDocument: document1 }, {}, {} )).toBe( true ); // state saved for document 1
            expect( getters.canUndo( state, { activeDocument: document2 }, {}, {} )).toBe( false ); // no state saved for document 2
        });

        it( "should know when it can redo an action when switching between Documents", async () => {
            mutations.registerDocument( state, document1 );
            mutations.registerDocument( state, document2 );

            mutations.saveState( state, { id: document1.id, undo: noop, redo: noop });
            mutations.saveState( state, { id: document2.id, undo: noop, redo: noop });

            // @ts-expect-error Not all constituents of type 'Action<HistoryState, any>' are callable.
            await actions.undo({ state, commit, getters: { activeDocument: document1 }});

            expect( getters.canRedo( state, { activeDocument: document1 }, {}, {} )).toBe( true ); // redo available after undo of action for document 1
            expect( getters.canRedo( state, { activeDocument: document2 }, {}, {} )).toBe( false ); // redo not available for document 2
        });

        it( "should keep track of the total amount of states registered, even when popped from the stack", () => {
            const { id } = document1;
            mutations.registerDocument( state, document1 );

            for ( let i = 0; i < STATES_TO_SAVE * 2; ++i ) {
                mutations.saveState( state, { id, undo: noop, redo: noop });
            }
            expect( state.documents.get( id ).stored ).toEqual( STATES_TO_SAVE * 2 ); // counts the cumulatives
            expect( state.documents.get( id ).historyIndex ).toEqual( STATES_TO_SAVE - 1 ); // never exceeds the total
        });
    });

    describe( "mutations", () => {
        describe( "when registering a new Document", () => {
            it( "should register a new history structure for it", () => {
                expect( state.documents.size ).toEqual( 0 );

                mutations.registerDocument( state, document1 );

                expect( state.documents.size ).toEqual( 1 );
                expect( state.documents.get( document1.id )).toEqual({
                    undoManager: expect.any( Object ),
                    historyIndex: -1,
                    blobUrls: expect.any( Map ),
                    stored: 0, 
                });
            });

            it( "should not register the same Document twice", () => {
                mutations.registerDocument( state, document1 );
                mutations.registerDocument( state, document1 );

                expect( state.documents.size ).toEqual( 1 );
            });

            it( "should be able to register multiple Documents with their own history structure", () => {
                mutations.registerDocument( state, document1 );
                mutations.registerDocument( state, document2 );

                expect( state.documents.size ).toEqual( 2 );
            });
        });

        describe( "when saving states", () => {
            it( "should be able to store a state and increment the history index for a Document", () => {
                mutations.registerDocument( state, document1 );
                const { id } = document1;

                mutations.saveState( state, { id, undo: noop, redo: noop });

                expect( state.documents.get( id ).historyIndex ).toEqual( 0 );
                
                mutations.saveState( state, { id, undo: noop, redo: noop });
                
                expect( state.documents.get( id ).historyIndex ).toEqual( 1 );
            });

            it( "should be able to individually manage states and history indices for different Documents", () => {
                mutations.registerDocument( state, document1 );
                mutations.registerDocument( state, document2 );

                mutations.saveState( state, { id: document1.id, undo: noop, redo: noop });
                mutations.saveState( state, { id: document1.id, undo: noop, redo: noop });
                
                mutations.saveState( state, { id: document2.id, undo: noop, redo: noop });
                mutations.saveState( state, { id: document2.id, undo: noop, redo: noop });
                mutations.saveState( state, { id: document2.id, undo: noop, redo: noop });
                
                expect( state.documents.get( document1.id ).historyIndex ).toEqual( 1 );
                expect( state.documents.get( document2.id ).historyIndex ).toEqual( 2 );
            });

            it( "should not store more states than are allowed", () => {
                mutations.registerDocument( state, document1 );
                const { id } = document1;

                for ( let i = 0; i < STATES_TO_SAVE * 2; ++i ) {
                    mutations.saveState( state, { id, undo: noop, redo: noop });
                }
                expect( state.documents.get( id ).historyIndex ).toEqual( STATES_TO_SAVE - 1 );
                expect( state.documents.get( id ).stored ).toEqual( STATES_TO_SAVE * 2 );
            });

            it( "should be able to store a list of optional Blob resources within a state", () => {
                const { id } = document1;
                mutations.registerDocument( state, document1 );

                const documentHistory = state.documents.get( id );

                expect( documentHistory.blobUrls.size ).toEqual( 0 ); // no URLS upon registration

                mutations.saveState( state, { id, undo: noop, redo: noop, resources: [ "foo" ] });
                mutations.saveState( state, { id, undo: noop, redo: noop });
                mutations.saveState( state, { id, undo: noop, redo: noop, resources: [ "bar", "baz" ]});

                expect( documentHistory.blobUrls.size ).toEqual( 2 );

                expect( documentHistory.blobUrls.get( 1 )).toEqual([ "foo" ]);
                expect( documentHistory.blobUrls.get( 3 )).toEqual([ "bar", "baz" ]);
            });

            it( "should free memory associated with optional Blob resources of popped states", () => {
                const { id } = document1;
                mutations.registerDocument( state, document1 );

                mockUpdateFn = vi.fn();

                // add enough states to exceed the limit to pop old states
                for ( let i = 0; i < STATES_TO_SAVE + 2; ++i ) {
                    // only add resources to first two states
                    const resources = ( i < 2 ) ? [ `resource_${i}`, `resource__${i}` ] : null;
                    mutations.saveState( state, { id, undo: noop, redo: noop, resources });
                }

                const documentHistory = state.documents.get( id );

                // assert the first state's resources have been freed while the second still exist
                expect( documentHistory.blobUrls.size ).toEqual( 1 );
                expect( documentHistory.blobUrls.has( 2 )).toBe( true ); // index of second, still available state
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "disposeResource", "resource_0" );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "disposeResource", "resource__0" );

                // push one more state to pop the second added state from the available undo stack
                mutations.saveState( state, { id, undo: noop, redo: noop });

                // assert the second state's resource have also been freed and no further
                // resources are listed (as no other states were stored with associated resources)
                expect( documentHistory.blobUrls.size ).toEqual( 0 );
                expect( documentHistory.blobUrls.has( 2 )).toBe( false );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "disposeResource", "resource_1" );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 4, "disposeResource", "resource__1" );
            });
        });

        it( "should be able to set the history index for a specific Document", () => {
            mutations.registerDocument( state, document1 );
            mutations.registerDocument( state, document2 );

            mutations.setHistoryIndex( state, { id: document1.id, index: 2 });
            mutations.setHistoryIndex( state, { id: document2.id, index: 30 });

            expect( state.documents.get( document1.id ).historyIndex ).toEqual( 2 );
            expect( state.documents.get( document2.id ).historyIndex ).toEqual( 30 );
        });

        describe( "when clearing Document history", () => {
            it( "should be able to clear a Documents history and allocated state resources", () => {
                const { id } = document1;
                mutations.registerDocument( state, document1 );

                const documentHistory = state.documents.get( id );
                
                mockUpdateFn = vi.fn();

                function shouldntRun() {
                    throw new Error( "undo/redo callback should not have fired after clearing the undo history" );
                }
                mutations.saveState( state, { id, undo: shouldntRun, redo: shouldntRun, resources: [ "foo", "bar" ] });
                mutations.saveState( state, { id, undo: shouldntRun, redo: shouldntRun, resources: [ "baz" ] });

                expect( documentHistory.blobUrls.size ).toEqual( 2 ); // sanity check that Blobs were registerd

                mutations.clearHistory( state, id );

                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "flushQueue" );
                expect( state.documents.has( id )).toBe( false ); // ensure history is removed from Map
                
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "disposeResource", "foo" );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "disposeResource", "bar" );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 4, "disposeResource", "baz" );
                expect( documentHistory.blobUrls.size ).toEqual( 0 ); // ensure Blob references are cleared from original history object
            });

            it( "should be able to clear individual Document history and resources", () => {
                mutations.registerDocument( state, document1 );
                mutations.registerDocument( state, document2 );

                mockUpdateFn = vi.fn();

                mutations.saveState( state, { id: document1.id, undo: noop, redo: noop, resources: [ "foo", "bar" ] });
                mutations.saveState( state, { id: document2.id, undo: noop, redo: noop, resources: [ "baz" ] });
                mutations.saveState( state, { id: document2.id, undo: noop, redo: noop, resources: [ "qux" ] });

                // sanity check that Blobs were registered

                expect( state.documents.get( document1.id ).blobUrls.size ).toEqual( 1 );
                expect( state.documents.get( document2.id ).blobUrls.size ).toEqual( 2 );

                mutations.clearHistory( state, document1.id );

                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "flushQueue" );

                expect( state.documents.has( document1.id )).toBe( false ); // ensure history for Document 1 is removed from the Map
                expect( state.documents.has( document2.id )).toBe( true ); // ensure history for Document 2 remains in the Map

                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "disposeResource", "foo" );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "disposeResource", "bar" );
                expect( mockUpdateFn ).not.toHaveBeenCalledWith( "disposeResource", "baz" );
                expect( mockUpdateFn ).not.toHaveBeenCalledWith( "disposeResource", "qux" );

                expect( state.documents.get( document2.id ).blobUrls.size ).toEqual( 2 ); // ensure Document 2 Blobs remain registered

                mutations.clearHistory( state, document2.id );

                expect( state.documents.has( document2.id )).toBe( false ); // ensure history for Document 2 is removed from the Map

                expect( mockUpdateFn ).toHaveBeenCalledWith( "disposeResource", "baz" );
                expect( mockUpdateFn ).toHaveBeenCalledWith( "disposeResource", "qux" );
            });
        });
    });

    describe( "actions", () => {
        it( "should be able to redo an action", async () => {
            const { id } = document1;
            mutations.registerDocument( state, document1 );

            commit = vi.fn();
            const redo = vi.fn();

            mutations.saveState( state, { id, undo: noop, redo: redo });

            // @ts-expect-error Not all constituents of type 'Action<HistoryState, any>' are callable.
            await actions.undo({ state, commit, getters: { activeDocument: document1 }});

            expect( commit ).toHaveBeenNthCalledWith( 1, "setHistoryIndex", { id: document1.id, index: -1 });

            // @ts-expect-error Not all constituents of type 'Action<HistoryState, any>' are callable.
            await actions.redo({ state, commit, getters: { activeDocument: document1 }});

            expect( redo ).toHaveBeenCalled();
            expect( commit ).toHaveBeenNthCalledWith( 2, "setHistoryIndex", { id: document1.id, index: 0 });
        });

        it( "should be able to undo an action when an action was stored in its state history", async () => {
            const { id } = document1;
            mutations.registerDocument( state, document1 );

            mockUpdateFn = vi.fn();
            const undo = vi.fn();

            mutations.saveState( state, { id, undo: undo, redo: noop });

            // @ts-expect-error Not all constituents of type 'Action<HistoryState, any>' are callable.
            await actions.undo({ state, commit, getters: { activeDocument: document1 }});

            expect( mockUpdateFn ).toHaveBeenCalledWith( "forceProcess" );
            expect( undo ).toHaveBeenCalled();
            expect( state.documents.get( id ).historyIndex).toEqual( 0 );
        });
    });
});
