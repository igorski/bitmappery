import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { reorderLayers } from "@/store/actions/layer-reorder";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "reorder layers action", () => {
    const document = DocumentFactory.create();
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to reorders the Layers within the Document by their ids", () => {
        reorderLayers( store, document, [ "a", "b", "c" ], [ "c", "b", "a" ]);

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "reorderLayers", {
            document,
            layerIds: [ "c", "b", "a" ],
        });
    });

    it( "should store the action in state history", () => {
        reorderLayers( store, document, [ "a", "b", "c" ], [ "c", "b", "a" ]);

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `reorderLayers_c,b,a`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original order when calling undo in state history", () => {
        reorderLayers( store, document, [ "a", "b", "c" ], [ "c", "b", "a" ]);

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "reorderLayers", {
            document,
            layerIds: [ "a", "b", "c" ],
        });
    });

    it( "should reapply the new order when calling redo in state history", () => {
        reorderLayers( store, document, [ "a", "b", "c" ], [ "c", "b", "a" ]);

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "reorderLayers", {
            document,
            layerIds: [ "c", "b", "a" ],
        });
    });
});