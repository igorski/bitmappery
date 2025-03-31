import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { addLayer } from "@/store/actions/layer-add";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "add Layer action", () => {
    const layer = LayerFactory.create();
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        store.getters.activeLayerIndex = 3;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to add a Layer to the Documents Layer list", () => {
        addLayer( store, layer, 2 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "insertLayerAtIndex", { index: 2, layer });
    });

    it( "should store the action in state history", () => {
        addLayer( store, layer, 2 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `layerAdd_2`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should remove the added Layer when calling undo in state history", () => {
        addLayer( store, layer, 2 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", 2 );
    });

    it( "should re-add the provided Layer when calling redo in state history", () => {
        addLayer( store, layer, 2 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", { index: 2, layer });
    });
});