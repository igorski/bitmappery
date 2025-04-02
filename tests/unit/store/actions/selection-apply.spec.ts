import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSelection, createMockShape, createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import { type Document } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import { type BitMapperyState } from "@/store";
import { applySelection } from "@/store/actions/selection-apply";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

const mockInteractionPaneSetSelection = vi.fn();
vi.mock( "@/services/canvas-service", () => ({
    getCanvasInstance: () => ({
        interactionPane: {
            setSelection: ( ...args: any[] ) => mockInteractionPaneSetSelection( ...args ),
        },
    }),
}));

const mockSyncSelection = vi.fn();
vi.mock( "@/utils/selection-util", () => ({
    syncSelection: ( ...args: any[] ) => mockSyncSelection( ...args ),
}));

describe( "Selection apply action", () => {
    const previousSelection = [ createMockShape(), createMockShape() ];
    let document: Document;
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        document = DocumentFactory.create({
            name: "foo",
            activeSelection: createMockSelection(),
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should not apply an update to the Interaction Pane selection (as the invocation site in interaction-pane takes care of it)", () => {
        applySelection( store, document, previousSelection );

        expect( mockInteractionPaneSetSelection ).not.toHaveBeenCalled();
        expect( mockSyncSelection ).not.toHaveBeenCalled();
    });

    it( "should store the action in state history", () => {
        applySelection( store, document, previousSelection, "Type" );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `selection_fooType`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should revert to the provided previous Selection when calling undo in state history", () => {
        applySelection( store, document, previousSelection );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( mockInteractionPaneSetSelection ).toHaveBeenCalledWith( previousSelection );
        expect( mockSyncSelection ).toHaveBeenCalled();
    });

    it( "should re-apply the Document Selection when calling redo in state history", () => {
        applySelection( store, document, previousSelection );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( mockInteractionPaneSetSelection ).toHaveBeenCalledTimes( 2 );
        expect( mockInteractionPaneSetSelection ).toHaveBeenNthCalledWith( 1, previousSelection );
        expect( mockInteractionPaneSetSelection ).toHaveBeenNthCalledWith( 2, document.activeSelection );
        expect( mockSyncSelection ).toHaveBeenCalledTimes( 1 );
    });
});