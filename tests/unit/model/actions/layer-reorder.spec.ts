import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import type { Document } from "@/model/types/document";
import DocumentFactory from "@/model/factories/document-factory";
import LayerFactory from "@/model/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { reorderLayers } from "@/model/actions/layer-reorder";

const mockEnqueueState = vi.fn();
vi.mock( "@/model/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

const mockCreateGroupTile = vi.fn();
vi.mock( "@/rendering/cache/tile-cache", () => ({
    createGroupTile: ( ...args: any[] ) => mockCreateGroupTile( ...args ),
}));

describe( "reorder layers action", () => {
    const tile1layer1 = LayerFactory.create({ rel: { type: "tile", id: 0 }});
    const tile1layer2 = LayerFactory.create({ rel: { type: "tile", id: 0 }});

    const tile2layer1 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2layer2 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2layer3 = LayerFactory.create({ rel: { type: "tile", id: 1 }});

    const tile3layer1 = LayerFactory.create({ rel: { type: "tile", id: 2 }});

    const shuffledLayerIds = [
        tile1layer1.id, tile1layer2.id,
        tile2layer3.id, tile2layer1.id, tile2layer2.id, // reorder is on this line!
        tile3layer1.id,
    ];
    let originalLayerIds: string[];
    let activeDocument: Document;
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();

        activeDocument = DocumentFactory.create({
            type: "timeline",
            layers: [
                tile1layer1, tile1layer2,
                tile2layer1, tile2layer2, tile2layer3,
                tile3layer1,
            ]
        });
        originalLayerIds = activeDocument.layers.map( layer => layer.id );
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to reorder the Layers within the Document by their ids", () => {
        reorderLayers( store, activeDocument, shuffledLayerIds);

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "reorderLayers", {
            activeDocument,
            layerIds: shuffledLayerIds,
        });
    });

    it( "should be able to reorder the Layers within the Document when receiving only a subset of all Layer content", () => {
        const shuffledSubSet = [ tile2layer3.id, tile2layer1.id, tile2layer2.id ];
        reorderLayers( store, activeDocument, shuffledSubSet);

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "reorderLayers", {
            activeDocument,
            layerIds: shuffledLayerIds, // expect shuffled set to have been applied to full content
        });
    });

    it( "should store the action in state history", () => {
        reorderLayers( store, activeDocument, shuffledLayerIds );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `reorderLayers_${shuffledLayerIds.join()}`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original order when calling undo in state history", () => {
        reorderLayers( store, activeDocument, shuffledLayerIds );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "reorderLayers", {
            activeDocument,
            layerIds: originalLayerIds,
        });
    });

    it( "should reapply the new order when calling redo in state history", () => {
        reorderLayers( store, activeDocument, shuffledLayerIds );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "reorderLayers", {
            activeDocument,
            layerIds: shuffledLayerIds,
        });
    });

    it( "should request a re-render of tiles associated with the layers", () => {
        reorderLayers( store, activeDocument, shuffledLayerIds );

        expect( mockCreateGroupTile ).toHaveBeenCalledTimes( 3 );
        expect( mockCreateGroupTile ).toHaveBeenNthCalledWith( 1, 0, activeDocument );
        expect( mockCreateGroupTile ).toHaveBeenNthCalledWith( 2, 1, activeDocument );
        expect( mockCreateGroupTile ).toHaveBeenNthCalledWith( 3, 2, activeDocument );
    });

    it( "should not request a re-render of tiles associated with the layers for non-timeline type Documents", () => {
        activeDocument.type = "default";

        reorderLayers( store, activeDocument, shuffledLayerIds );

        expect( mockCreateGroupTile ).not.toHaveBeenCalled();
    });
});