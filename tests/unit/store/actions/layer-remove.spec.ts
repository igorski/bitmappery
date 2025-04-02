import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { removeLayer } from "@/store/actions/layer-remove";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "remove Layer action", () => {
    const layer = LayerFactory.create();
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        store.getters.activeLayerIndex = 3;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to remove a Layer from the Documents Layer list", () => {
        removeLayer( store, layer, 2 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "removeLayer", 2 );
    });

    it( "should store the action in state history", () => {
        removeLayer( store, layer, 2 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `layerRemove_2`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should re-add the removed Layer when calling undo in state history", () => {
        removeLayer( store, layer, 2 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "insertLayerAtIndex", { index: 2, layer });
    });

    it( "should re-remove the Layer when calling redo in state history", () => {
        removeLayer( store, layer, 2 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "removeLayer", 2 );
    });
});