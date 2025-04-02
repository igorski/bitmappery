import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { removeMask } from "@/store/actions/mask-remove";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "remove mask action", () => {
    const layer = LayerFactory.create();
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to remove a mask from a specific Layer within the Document", () => {
        removeMask( store, layer, 2 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "updateLayer", {
            index: 2,
            opts: { mask: null },
        });
    });

    it( "should store the action in state history", () => {
        removeMask( store, layer, 2 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `maskRemove_2`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the removed mask when calling undo in state history", () => {
        const { mask } = layer;

        removeMask( store, layer, 2 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "updateLayer", {
            index: 2,
            opts: { mask },
        });
    });

    it( "should remove the restored mask when calling redo in state history", () => {
        removeMask( store, layer, 2 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "updateLayer", {
            index: 2,
            opts: { mask: null },
        });
    });
});