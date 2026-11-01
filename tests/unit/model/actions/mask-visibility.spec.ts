import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "../../mocks";
import LayerFactory from "@/model/factories/layer-factory";
import MaskFactory from "@/model/factories/mask-factory";
import { type BitMapperyState } from "@/store";
import { toggleLayerMaskVisibility } from "@/model/actions/mask-visibility";

const mockEnqueueState = vi.fn();
vi.mock( "@/model/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "toggle Mask visibility action", () => {
    const layer = LayerFactory.create({
        mask: MaskFactory.create({ enabled: true }),
    });
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to disable visibility of a Mask from a specific Layer within the Document", () => {
        toggleLayerMaskVisibility( store, layer, 2 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "updateLayer", {
            index: 2,
            opts: {
                mask: {
                    ...layer.mask,
                    enabled: false,
                },
            },
        });
    });

    it( "should store the action in state history", () => {
        toggleLayerMaskVisibility( store, layer, 2 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `maskVisibility_${layer.id}`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the Mask visibility when calling undo in state history", () => {
        toggleLayerMaskVisibility( store, layer, 2 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "updateLayer", {
            index: 2,
            opts: {
                mask: {
                    ...layer.mask,
                    enabled: true,
                },
            },
        });
    });

    it( "should reset visibility of the restored Mask when calling redo in state history", () => {
        toggleLayerMaskVisibility( store, layer, 2 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "updateLayer", {
            index: 2,
            opts: {
                mask: {
                    ...layer.mask,
                    enabled: false,
                },
            },
        });
    });
});