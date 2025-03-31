import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { toggleLayerVisibility } from "@/store/actions/toggle-layer-visibility";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "toggle layer visibility action", () => {
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        store.getters.layers = [
            LayerFactory.create(), LayerFactory.create(), LayerFactory.create()
        ];
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to toggle the visibility of a specific Layer within the Document", () => {
        toggleLayerVisibility( store, 1 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "updateLayer", {
            index: 1,
            opts: {
                visible: false,
            },
        });
    });

    it( "should store the action in state history", () => {
        toggleLayerVisibility( store, 1 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `layerVisibility_1`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original value when calling undo in state history", () => {
        toggleLayerVisibility( store, 1 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "updateLayer", {
            index: 1,
            opts: { 
                visible: true
            },
        });
    });

    it( "should restore the toggled value when calling redo in state history", () => {
        toggleLayerVisibility( store, 1 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "updateLayer", {
            index: 1,
            opts: { 
                visible: false
            },
        });
    });
});