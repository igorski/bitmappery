import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import { LayerTypes } from "@/definitions/layer-types";
import { type BitMapperyState } from "@/store";
import { addTextLayer } from "@/store/actions/layer-add-text-layer";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "add text Layer action", () => {
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        store.getters.activeLayerIndex = 3;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to add new Text Layer into the Documents Layer list", () => {
        addTextLayer( store );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "addLayer", { type: LayerTypes.LAYER_TEXT });
    });

    it( "should store the action in state history", () => {
        addTextLayer( store );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `layerAdd_${store.getters.activeLayerIndex}`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should remove the added Text Layer when calling undo in state history", () => {
        addTextLayer( store );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", store.getters.activeLayerIndex );
    });

    it( "should re-add a Text Layer when calling redo in state history", () => {
        addTextLayer( store );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "addLayer", { type: LayerTypes.LAYER_TEXT });
    });
});