import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { reorderLayers } from "@/store/actions/layer-reorder";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "reorder layers action", () => {
    const tile1layer1 = LayerFactory.create({ rel: { type: "tile", id: 0 }});
    const tile1layer2 = LayerFactory.create({ rel: { type: "tile", id: 0 }});

    const tile2layer1 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2layer2 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2layer3 = LayerFactory.create({ rel: { type: "tile", id: 1 }});

    const tile3layer1 = LayerFactory.create({ rel: { type: "tile", id: 2 }});

    const document = DocumentFactory.create({
        layers: [
            tile1layer1, tile1layer2,
            tile2layer1, tile2layer2, tile2layer3,
            tile3layer1,
        ]
    });

    const originalLayerIds = document.layers.map( layer => layer.id );
    const shuffledLayerIds = [
        tile1layer1.id, tile1layer2.id,
        tile2layer3.id, tile2layer1.id, tile2layer2.id, // reorder is on this line!
        tile3layer1.id,
    ];
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to reorder the Layers within the Document by their ids", () => {
        reorderLayers( store, document, shuffledLayerIds);

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "reorderLayers", {
            document,
            layerIds: shuffledLayerIds,
        });
    });

    it( "should be able to reorder the Layers within the Document when receiving only a subset of all Layer content", () => {
        const shuffledSubSet = [ tile2layer3.id, tile2layer1.id, tile2layer2.id ];
        reorderLayers( store, document, shuffledSubSet);

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "reorderLayers", {
            document,
            layerIds: shuffledLayerIds, // expect shuffled set to have been applied to full content
        });
    });

    it( "should store the action in state history", () => {
        reorderLayers( store, document, shuffledLayerIds );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `reorderLayers_${shuffledLayerIds.join()}`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original order when calling undo in state history", () => {
        reorderLayers( store, document, shuffledLayerIds );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "reorderLayers", {
            document,
            layerIds: originalLayerIds,
        });
    });

    it( "should reapply the new order when calling redo in state history", () => {
        reorderLayers( store, document, shuffledLayerIds );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "reorderLayers", {
            document,
            layerIds: shuffledLayerIds,
        });
    });
});