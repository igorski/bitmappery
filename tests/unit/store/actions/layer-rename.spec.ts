import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { renameLayer } from "@/store/actions/layer-rename";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "renamer layer action", () => {
    const layer = LayerFactory.create({ name: "foo" });
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to rename a specific Layer within the Document", () => {
        renameLayer( store, layer, 2, "bar" );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "updateLayer", {
            index: 2,
            opts: { name: "bar" },
        });
    });

    it( "should store the action in state history", () => {
        renameLayer( store, layer, 2, "bar" );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `layerName_2`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original name when calling undo in state history", () => {
        renameLayer( store, layer, 2, "bar" );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "updateLayer", {
            index: 2,
            opts: { name: "foo" },
        });
    });

    it( "should reapply the new name when calling redo in state history", () => {
        renameLayer( store, layer, 2, "bar" );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "updateLayer", {
            index: 2,
            opts: { name: "bar" },
        });
    });
});