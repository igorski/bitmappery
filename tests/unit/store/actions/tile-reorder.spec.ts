import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, flushPromises, mockZCanvas } from "../../mocks";

mockZCanvas();

import type { Document, Layer } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { reorderTiles } from "@/store/actions/tile-reorder";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

const mockRebuildAllThumbnails = vi.fn();
vi.mock( "@/rendering/cache/thumbnail-cache", () => ({
    rebuildAllThumbnails: ( ...args: any[] ) => mockRebuildAllThumbnails( ...args ),
}));

const mockRebuildAllTiles = vi.fn();
vi.mock( "@/rendering/cache/tile-cache", () => ({
    rebuildAllTiles: ( ...args: any[] ) => mockRebuildAllTiles( ...args ),
}));

describe( "Tile reorder action", () => {
    let store: Store<BitMapperyState>;
    let activeDocument: Document;
    
    const tile1Layer1 = LayerFactory.create({ rel: { type: "tile", id: 0 }});
    const tile1Layer2 = LayerFactory.create({ rel: { type: "tile", id: 0 }});

    const tile2Layer1 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2Layer2 = LayerFactory.create({ rel: { type: "tile", id: 1 }});

    const tile3Layer1 = LayerFactory.create({ rel: { type: "tile", id: 2 }});

    beforeEach(() => {
        store = createStore();
        store.getters.activeGroup = 1;

        activeDocument = DocumentFactory.create({
            width: 500,
            height: 500,
            layers: [
                tile1Layer1, tile1Layer2,
                tile2Layer1, tile2Layer2,
                tile3Layer1,
            ],
        });
        activeDocument.groups = [ 0, 1, 2 ];
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "when reordering tiles", () => {
        it( "should reorder the layer indices", () => {
            reorderTiles( store, activeDocument, [ 1, 0, 2 ]);

            expect( store.commit ).toHaveBeenCalledWith( "reorderLayers", {
                activeDocument,
                layerIds: [
                    tile2Layer1.id, tile2Layer2.id,
                    tile1Layer1.id, tile1Layer2.id,
                    tile3Layer1.id,
                ],
            });
        });

        it( "should rebuild all Layer thumbnails", async () => {
            reorderTiles( store, activeDocument, [ 1, 0, 2 ]);

            expect( mockRebuildAllThumbnails ).toHaveBeenCalledOnce();
        });

        it( "should rebuild all tiles", async () => {
            reorderTiles( store, activeDocument, [ 1, 0, 2 ]);

            await flushPromises();

            expect( mockRebuildAllTiles ).toHaveBeenCalledOnce();
        });
    });

    describe( "when restoring tile reordering", () => {
        it( "should restore the original Layer indices", async () => {
            reorderTiles( store, activeDocument, [ 1, 0, 2 ]);

            await flushPromises();

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).toHaveBeenCalledWith( "reorderLayers", {
                activeDocument,
                layerIds: [
                    tile1Layer1.id, tile1Layer2.id,
                    tile2Layer1.id, tile2Layer2.id,
                    tile3Layer1.id,
                ],
            });
        });

        it( "should rebuild all Layer thumbnails", async () => {
            reorderTiles( store, activeDocument, [ 1, 0, 2 ]);

            await flushPromises();

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( mockRebuildAllThumbnails ).toHaveBeenCalledOnce();
        });

        it( "should rebuild all tiles", async () => {
            reorderTiles( store, activeDocument, [ 1, 0, 2 ]);

            await flushPromises();

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            await flushPromises();

            expect( mockRebuildAllTiles ).toHaveBeenCalledOnce();
        });
    });
});