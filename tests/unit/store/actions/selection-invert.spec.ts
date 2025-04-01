import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSelection, createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import { type Document } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import { type BitMapperyState } from "@/store";
import { invertSelection } from "@/store/actions/selection-invert";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

const mockInteractionPaneInvalidate = vi.fn();
vi.mock( "@/services/canvas-service", () => ({
    getCanvasInstance: () => ({
        interactionPane: {
            invalidate: () => mockInteractionPaneInvalidate(),
        },
    }),
}));

const mockSyncSelection = vi.fn();
vi.mock( "@/utils/selection-util", () => ({
    syncSelection: ( ...args: any[] ) => mockSyncSelection( ...args ),
}));

describe( "Selection invert action", () => {
    let document: Document;
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        document = DocumentFactory.create({
            activeSelection: createMockSelection(),
            invertSelection: false,
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to invert the Selection", () => {
        invertSelection( store, document );

        expect( document.invertSelection ).toBe( true );
        expect( mockSyncSelection ).toHaveBeenCalledOnce();
        expect( mockInteractionPaneInvalidate ).toHaveBeenCalledOnce();
    });

    it( "should store the action in state history", () => {
        invertSelection( store, document );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `invert`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should revert the inverted Selection when calling undo in state history", () => {
        invertSelection( store, document );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( document.invertSelection ).toBe( false );
        expect( mockSyncSelection ).toHaveBeenCalledTimes( 2 );
        expect( mockInteractionPaneInvalidate ).toHaveBeenCalledTimes( 2 );
    });

    it( "should re-invert the Selection when calling redo in state history", () => {
        invertSelection( store, document );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( document.invertSelection ).toBe( true );
        expect( mockSyncSelection ).toHaveBeenCalledTimes( 3 );
        expect( mockInteractionPaneInvalidate ).toHaveBeenCalledTimes( 3 );
    });
});