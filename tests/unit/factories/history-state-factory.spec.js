/**
 * @jest-environment jsdom
 */
import { initHistory, hasQueue, queueLength, flushQueue, enqueueState } from "@/factories/history-state-factory";

describe( "History state factory", () => {
    let store;

    beforeEach(() => {
        store = {
            commit: jest.fn(),
        };
        flushQueue();
        initHistory( store );
        jest.useFakeTimers( "legacy" );
    });

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    });

    describe( "when enqueue-ing history states", () => {
        it( "should know when there is a state object queued", () => {
            expect( hasQueue() ).toBe( false );
            expect( queueLength() ).toBe( 0 );

            enqueueState( "foo", { undo: jest.fn(), redo: jest.fn() });

            expect( hasQueue() ).toBe( true );
            expect( queueLength() ).toBe( 1 );
        });

        it( "should start a timeout before adding an enqueued state to the history module", () => {
            enqueueState( "foo", { undo: jest.fn(), redo: jest.fn() });
            expect( setTimeout ).toHaveBeenCalledTimes( 1 );
            expect( setTimeout ).toHaveBeenLastCalledWith( expect.any( Function ), 1000 );
        });

        it( "should commit the enqueued state into the history module when the timeout fires", () => {
            const historyState1 = { undo: jest.fn(), redo: jest.fn() };
            enqueueState( "foo", historyState1 );
            jest.advanceTimersByTime( 1000 );
            expect( store.commit ).toHaveBeenCalledWith( "saveState", historyState1 );
        });

        it( "should be able to enqueue multiple states for different properties by immediately processing the pending queue", () => {
            const historyState1 = { undo: jest.fn(), redo: jest.fn() };
            const historyState2 = { undo: jest.fn(), redo: jest.fn() };

            enqueueState( "foo", historyState1 );
            expect( clearTimeout ).not.toHaveBeenCalled();
            expect( setTimeout ).toHaveBeenCalledTimes( 1 );

            enqueueState( "bar", historyState2 );

            // assert first timeout has been cleared
            expect( clearTimeout ).toHaveBeenCalledTimes( 1 );
            // assert first state has been committed immediately
            expect( store.commit ).toHaveBeenNthCalledWith( 1, "saveState", historyState1 );
            // assert a new timer has been started for the newly enqueued state
            expect( setTimeout ).toHaveBeenCalledTimes( 2 );
            // and queue length is 1 (holding just the newly enqueued state)
            expect( queueLength() ).toBe( 1 );

            // assert second state is only committed once the timer expires
            expect( store.commit ).not.toHaveBeenNthCalledWith( 2, "saveState", historyState2 );
            jest.advanceTimersByTime( 1000 );
            expect( store.commit ).toHaveBeenNthCalledWith( 2, "saveState", historyState2 );
        });

        it( "when enqueing multiple states for the same property, it should update the first entry's redo state and not add a new entry for the same property", () => {
            const historyState1 = { undo: jest.fn(), redo: jest.fn() };
            const historyState2 = { undo: jest.fn(), redo: jest.fn() };

            enqueueState( "foo", historyState1 );
            enqueueState( "foo", historyState2 );

            expect( queueLength() ).toBe( 1 );

            // ensure the first queued state has updated its redo state to the lsat entry
            expect( historyState1.redo ).toEqual( historyState2.redo );
            // ensure the first queued state undo remains unchanged
            expect( historyState1.undo ).not.toEqual( historyState2.undo );
        });
    });

    it( "should be able to flush the queue and cancel pending timeouts", () => {
        enqueueState({ undo: jest.fn(), redo: jest.fn() });
        flushQueue();
        expect( clearTimeout ).toHaveBeenCalledTimes( 1 );
        expect( hasQueue() ).toBe( false );
    });
});
