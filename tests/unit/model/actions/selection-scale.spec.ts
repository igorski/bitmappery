import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockShape, createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import { type Document } from "@/model/types/document";
import DocumentFactory from "@/model/factories/document-factory";
import { type BitMapperyState } from "@/store";
import { applyScaleToSelection } from "@/model/actions/selection-scale";

const mockEnqueueState = vi.fn();
vi.mock( "@/model/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

const mockScaleSelection = vi.fn();
const mockSyncSelection = vi.fn();
const mockScaledSelection = [ createMockShape(), createMockShape() ];

vi.mock( "@/utils/selection-util", () => ({
    scaleSelection: ( ...args: any[] ) => {
        mockScaleSelection( ...args );
        return mockScaledSelection;
    },
    syncSelection: ( ...args: any[] ) => mockSyncSelection( ...args ),
}));

describe( "Selection scale action", () => {
    const previousSelection = [ createMockShape(), createMockShape() ];
    let activeDocument: Document;
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        activeDocument = DocumentFactory.create({
            name: "foo",
        });
        activeDocument.activeSelection = [ ...previousSelection ];
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should scale the active Selection by the provided factor", () => {
        applyScaleToSelection( store, activeDocument, 1.5 );

        expect( mockScaleSelection ).toHaveBeenCalledWith( activeDocument.activeSelection, 1.5 );
        expect( store.commit ).toHaveBeenCalledWith( "setActiveSelection", mockScaledSelection );
    });

    it( "should store the action in state history", () => {
        applyScaleToSelection( store, activeDocument, 1.5 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `selection_foo_scale_1.5`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should revert to the provided previous Selection when calling undo in state history", () => {
        applyScaleToSelection( store, activeDocument, 1.5 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledWith( "setActiveSelection", previousSelection );
        expect( mockSyncSelection ).toHaveBeenCalledTimes( 2 );
    });

    it( "should re-apply the scaled Selection when calling redo in state history", () => {
        applyScaleToSelection( store, activeDocument, 1.5 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        
        expect( store.commit ).toHaveBeenNthCalledWith( 1, "setActiveSelection", mockScaledSelection );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "setActiveSelection", previousSelection );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "setActiveSelection", mockScaledSelection );

        expect( mockSyncSelection ).toHaveBeenCalledTimes( 3 );
    });
});