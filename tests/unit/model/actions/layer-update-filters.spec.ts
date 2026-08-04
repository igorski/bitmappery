import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import FiltersFactory from "@/model/factories/filters-factory";
import { type BitMapperyState } from "@/store";
import { updateLayerFilters } from "@/model/actions/layer-update-filters";

const mockEnqueueState = vi.fn();
vi.mock( "@/model/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "paste layer filters action", () => {
    const orgFilters = FiltersFactory.create({ gamma: 0.5 })
    const filters    = FiltersFactory.create({ contrast: 0.5, vibrance: 1 });
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should by default broadcast an immediate update to the Layers Filters", () => {
        updateLayerFilters( store, 1, orgFilters, filters );

        expect( store.commit ).toHaveBeenCalled();
    });

    it( "should not broadcast an immediate update to the Layers Filters when requested", () => {
        updateLayerFilters( store, 1, orgFilters, filters, false );

        expect( store.commit ).not.toHaveBeenCalled();
    });

    it( "should store the action in state history", () => {
        updateLayerFilters( store, 1, orgFilters, filters );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `filters_1_`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should store the action in state history with a suffix when provided", () => {
        updateLayerFilters( store, 1, orgFilters, filters, false, "foo" );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `filters_1_foo`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original filters when calling undo in state history", () => {
        updateLayerFilters( store, 1, orgFilters, filters, false );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenNthCalledWith( 1, "updateLayer", {
            index: 1,
            opts: { 
                filters: orgFilters,
            },
        });
    });

    it( "should restore to the provided filters when calling redo in state history", () => {
        updateLayerFilters( store, 1, orgFilters, filters, false );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "updateLayer", {
            index: 1,
            opts: { 
                filters,
            },
        });
    });
});