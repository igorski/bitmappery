import UndoManager from "undo-manager";
import store, { STATES_TO_SAVE } from "@/store/modules/history-module";
const { getters, mutations, actions }  = store;

let mockUpdateFn;
jest.mock( "@/factories/history-state-factory", () => ({
    forceProcess: (...args) => mockUpdateFn?.( "forceProcess", ...args ),
    flushQueue: (...args) => mockUpdateFn?.( "flushQueue", ...args )
}));

describe( "History State module", () => {
    const noop = () => {};
    let commit = jest.fn();
    let state;

    beforeEach( () => {
        state = {
            undoManager: new UndoManager(),
            historyIndex: -1,
            blobUrls: new Map(),
            stored: 0,
        };
        state.undoManager.setLimit( STATES_TO_SAVE );
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    describe("getters", () => {
        it("should know when it can undo an action", async () => {
            expect(getters.canUndo(state, { canUndo: state.undoManager.hasUndo() })).toBe(false); // expected no undo to be available after construction
            mutations.saveState(state, { undo: noop, redo: noop });
            expect(getters.canUndo(state, { canUndo: state.undoManager.hasUndo() })).toBe(true); // expected undo to be available after addition of action
            await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});
            expect(getters.canUndo(state, { canUndo: state.undoManager.hasUndo() })).toBe(false); // expected no undo to be available after having undone all actions
        });

        it("should know when it can redo an action", async () => {
            expect(getters.canRedo(state)).toBe(false); // expected no redo to be available after construction
            mutations.saveState(state, { undo: noop, redo: noop });
            expect(getters.canRedo(state)).toBe(false); // expected no redo to be available after addition of action
            await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});
            expect(getters.canRedo(state)).toBe(true); // expected redo to be available after having undone actions
            await actions.redo({ state, commit, getters: { canRedo: state.undoManager.hasRedo() }});
            expect(getters.canRedo(state)).toBe(false); // expected no redo to be available after having redone all actions
        });

        it("should know the amount of states it can restore", async () => {
            commit = (action, value) => state.historyIndex = value;
            expect(0).toEqual(getters.amountOfStates(state)); // expected no states to be present after construction

            for ( let i = 0; i < STATES_TO_SAVE; ++i ) {
                mutations.saveState(state, { undo: noop, redo: noop });
                expect(i + 1).toEqual(getters.amountOfStates(state)); // expected amount of states to increase when storing new states
            }

            for ( let i = STATES_TO_SAVE - 1; i >= 0; --i ) {
                await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});
                expect(i).toEqual(getters.amountOfStates(state)); // expected amount of states to decrease when performing undo
            }

            for ( let i = 0; i < STATES_TO_SAVE; ++i ) {
                await actions.redo({ state, commit, getters: { canRedo: state.undoManager.hasRedo() }});
                expect(i + 1).toEqual(getters.amountOfStates(state)); // expected amount of states to increase when performing redo
            }
        });

        it( "should keep track of the total amount of states registered, even when popped from the stack", () => {
            for ( let i = 0; i < STATES_TO_SAVE * 2; ++i ) {
                mutations.saveState(state, { undo: noop, redo: noop });
            }
            expect( state.stored ).toEqual( STATES_TO_SAVE * 2 ); // total counts the cumulatives
            expect( getters.amountOfStates( state )).toEqual( STATES_TO_SAVE ); // states never exceed the total
        });
    });

    describe( "mutations", () => {
        describe( "when saving states", () => {
            it( "should be able to store a state and increment the history index", () => {
                mutations.saveState( state, { undo: noop, redo: noop });
                expect( state.historyIndex ).toEqual( 0 );
                mutations.saveState( state, { undo: noop, redo: noop });
                expect( state.historyIndex ).toEqual( 1 );
            });

            it( "should not store more states than are allowed", () => {
                for ( let i = 0; i < STATES_TO_SAVE * 2; ++i ) {
                    mutations.saveState( state, { undo: noop, redo: noop });
                }
                // expected model to not have recorded more states than the defined maximum
                expect( getters.amountOfStates( state )).toEqual( STATES_TO_SAVE );
            });

            it( "should be able to store a list of optional Blob resources within a state", () => {
                expect( state.blobUrls.size ).toEqual( 0 );

                mutations.saveState( state, { undo: noop, redo: noop, resources: [ "foo" ] });
                mutations.saveState( state, { undo: noop, redo: noop });
                mutations.saveState( state, { undo: noop, redo: noop, resources: [ "bar", "baz" ]});

                expect( state.blobUrls.size ).toEqual( 2 );

                expect( state.blobUrls.get( 1 )).toEqual([ "foo" ]);
                expect( state.blobUrls.get( 3 )).toEqual([ "bar", "baz" ]);
            });

            it( "should free memory associated with optional Blob resources of popped states", () => {
                window.URL = { revokeObjectURL: jest.fn() };

                // add enough states to exceed the limit to pop old states
                for ( let i = 0; i < STATES_TO_SAVE + 2; ++i ) {
                    // only add resources to first two states
                    const resources = ( i < 2 ) ? [ `resource_${i}`, `resource__${i}` ] : null;
                    mutations.saveState( state, { undo: noop, redo: noop, resources });
                }
                // assert the first state's resources have been freed while the second still exist
                expect( state.blobUrls.size ).toEqual( 1 );
                expect( state.blobUrls.has( 2 )).toBe( true ); // index of second, still available state
                expect( window.URL.revokeObjectURL ).toHaveBeenNthCalledWith( 1, "resource_0" );
                expect( window.URL.revokeObjectURL ).toHaveBeenNthCalledWith( 2, "resource__0" );

                // push one more state to pop the second added state from the available undo stack
                mutations.saveState( state, { undo: noop, redo: noop });

                // assert the second state's resource have also been freed and no further
                // resources are listed (as no other states were stored with associated resources)
                expect( state.blobUrls.size ).toEqual( 0 );
                expect( state.blobUrls.has( 2 )).toBe( false );
                expect( window.URL.revokeObjectURL ).toHaveBeenNthCalledWith( 3, "resource_1" );
                expect( window.URL.revokeObjectURL ).toHaveBeenNthCalledWith( 4, "resource__1" );
            });
        });

        it( "should be able to set the history index", () => {
            mutations.setHistoryIndex(state, 2);
            expect(state.historyIndex).toEqual(2);
        });

        it("should be able to clear its history and allocated state resources", () => {
            mockUpdateFn = jest.fn();

            function shouldntRun() {
                throw new Error( "undo/redo callback should not have fired after clearing the undo history" );
            }
            mutations.saveState(state, { undo: shouldntRun, redo: shouldntRun, resources: [ "foo", "bar" ] });
            mutations.saveState(state, { undo: shouldntRun, redo: shouldntRun, resources: [ "baz" ] });

            window.URL = { revokeObjectURL: jest.fn() };

            mutations.resetHistory( state );

            expect( mockUpdateFn ).toHaveBeenCalledWith( "flushQueue" );
            expect( state.historyIndex ).toEqual( -1 );
            expect( getters.canUndo( state )).toBe( false ); // expected no undo to be available after flushing of history
            expect( getters.canRedo( state )).toBe( false ); // expected no redo to be available after flushing of history
            expect( getters.amountOfStates( state )).toEqual( 0 ); // expected no states to be present in history
            expect( state.stored ).toEqual( 0 );

            expect( window.URL.revokeObjectURL ).toHaveBeenNthCalledWith( 1, "foo" );
            expect( window.URL.revokeObjectURL ).toHaveBeenNthCalledWith( 2, "bar" );
            expect( window.URL.revokeObjectURL ).toHaveBeenNthCalledWith( 3, "baz" );

            expect( state.blobUrls.size ).toEqual( 0 );
        });
    });

    describe("actions", () => {
        it("should be able to redo an action", async () => {
            commit = jest.fn();
            const redo = jest.fn();
            mutations.saveState(state, { undo: noop, redo: redo });

            await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});
            expect(commit).toHaveBeenNthCalledWith(1, "setHistoryIndex", -1);
            await actions.redo({ state, commit, getters: { canRedo: state.undoManager.hasRedo() }});

            expect(redo).toHaveBeenCalled();
            expect(commit).toHaveBeenNthCalledWith(2, "setHistoryIndex", 0);
        });

        it("should be able to undo an action when an action was stored in its state history", async () => {
            mockUpdateFn = jest.fn();

            const undo = jest.fn();
            mutations.saveState(state, { undo: undo, redo: noop });

            await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});

            expect(mockUpdateFn).toHaveBeenCalledWith( "forceProcess" );
            expect(undo).toHaveBeenCalled();
            expect(state.historyIndex).toEqual(0);
        });
    });
});
