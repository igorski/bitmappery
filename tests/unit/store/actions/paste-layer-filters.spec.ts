import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { pasteLayerFilters } from "@/store/actions/paste-layer-filters";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "paste layer filters action", () => {
    const layer   = LayerFactory.create();
    const filters = FiltersFactory.create();
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to apply provided Filters onto the given Layer", () => {
        pasteLayerFilters( store, filters, layer, 1 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "updateLayer", {
            index: 1,
            opts: {
                filters,
            },
        });
    });

    it( "should store the action in state history", () => {
        pasteLayerFilters( store, filters, layer, 1 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `pasteFilters_1`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original value when calling undo in state history", () => {
        const orgFilters = { ...layer.filters };

        pasteLayerFilters( store, filters, layer, 1 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "updateLayer", {
            index: 1,
            opts: { 
                filters: orgFilters,
            },
        });
    });

    it( "should restore to the provided value when calling redo in state history", () => {
        pasteLayerFilters( store, filters, layer, 1 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "updateLayer", {
            index: 1,
            opts: { 
                filters,
            },
        });
    });
});