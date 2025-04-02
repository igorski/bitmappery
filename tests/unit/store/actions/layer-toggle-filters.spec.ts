import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { toggleLayerFilters } from "@/store/actions/layer-toggle-filters";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "toggle layer filters action", () => {
    const originalFilters = FiltersFactory.create({
        enabled: true,
        opacity: 0.5,
    });
    const layer = LayerFactory.create({
        filters: originalFilters,
    });
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to toggle the visibility of a specific Layer within the Document", () => {
        toggleLayerFilters( store, layer, 1 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "updateLayer", {
            index: 1,
            opts: {
                filters: {
                    ...originalFilters,
                    enabled: !originalFilters.enabled,
                },
            },
        });
    });

    it( "should store the action in state history", () => {
        toggleLayerFilters( store, layer, 1 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `layerFiltersEnabled_1`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original value when calling undo in state history", () => {
        toggleLayerFilters( store, layer, 1 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "updateLayer", {
            index: 1,
            opts: { 
                filters: originalFilters,
            },
        });
    });

    it( "should restore the toggled value when calling redo in state history", () => {
        toggleLayerFilters( store, layer, 1 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "updateLayer", {
            index: 1,
            opts: { 
                filters: {
                    ...originalFilters,
                    enabled: !originalFilters.enabled,
                },
            },
        });
    });
});