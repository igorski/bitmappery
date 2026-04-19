import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCanvasElement, createStore, flushPromises, mockZCanvas } from "../../mocks";

mockZCanvas();

import { type Document } from "@/model/types/document";
import DocumentFactory from "@/model/factories/document-factory";
import LayerFactory from "@/model/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { cloneTile } from "@/model/actions/tile-clone";

const mockEnqueueState = vi.fn();
vi.mock( "@/model/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

const mockFlushTileCache = vi.fn();
const mockRebuildAllTiles = vi.fn();
vi.mock( "@/rendering/cache/tile-cache", () => ({
    flushTileCache: ( ...args: any[] ) => mockFlushTileCache( ...args ),
    rebuildAllTiles: ( ...args: any[] ) => mockRebuildAllTiles( ...args ),
}));

vi.mock( "@/utils/canvas-util", async ( importOriginal ) => {
    return {
        ...await importOriginal(),
        cloneCanvas: () => createMockCanvasElement(),
        cloneResized: ( _src: any, width: number, height: number ) => createMockCanvasElement( width, height ),
    }
});

describe( "Tile clone action", () => {
    let store: Store<BitMapperyState>;
    let activeDocument: Document;
    
    const tile1Layer1 = LayerFactory.create({ rel: { type: "tile", id: 0 }});
    const tile1Layer2 = LayerFactory.create({ rel: { type: "tile", id: 0 }});

    const tile2Layer1 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2Layer2 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2Layer3 = LayerFactory.create({ rel: { type: "tile", id: 1 }});

    const tile3Layer1 = LayerFactory.create({ rel: { type: "tile", id: 2 }});

    const tile4Layer1 = LayerFactory.create({ rel: { type: "tile", id: 3 }});
    const tile4Layer2 = LayerFactory.create({ rel: { type: "tile", id: 3 }});

    beforeEach(() => {
        store = createStore();
        store.getters.activeGroup = 1;

        activeDocument = DocumentFactory.create({
            layers: [
                tile1Layer1, tile1Layer2,
                tile2Layer1, tile2Layer2, tile2Layer3,
                tile3Layer1,
                tile4Layer1, tile4Layer2,
            ],
        });
        activeDocument.groups = [ 0, 1, 2, 3 ];
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "when cloning a tile", () => {
        it( "should be able to clone the tiles Layer contents and append it after the original", () => {
            cloneTile( store, activeDocument, 2 );

            expect( store.commit ).toHaveBeenNthCalledWith( 1, "insertLayerAtIndex", { index: 6, layer: expect.any( Object )});
        });

        it( "should mark the cloned set index as the active set", () => {
            cloneTile( store, activeDocument, 2 );

            expect( store.commit ).toHaveBeenCalledWith( "setActiveGroup", 3 );
        });

        it( "should be able to clone the tiles Layer contents and inject it between tile sets", () => {
            cloneTile( store, activeDocument, 1 );

            expect( store.commit ).toHaveBeenNthCalledWith( 1, "insertLayerAtIndex", { index: 5, layer: expect.any( Object )});
            expect( store.commit ).toHaveBeenNthCalledWith( 2, "insertLayerAtIndex", { index: 6, layer: expect.any( Object )});
            expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", { index: 7, layer: expect.any( Object )});

            // validate existing sets with id 2 and 3 have moved to 3 and 4
            // NOTE: we don't check for exact index numbers as the mocked store function do not update the document
            // checking for rel id should cover the use case though

            expect( store.commit ).toHaveBeenNthCalledWith( 4, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 3 }}});
            expect( store.commit ).toHaveBeenNthCalledWith( 5, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 4 }}});
            expect( store.commit ).toHaveBeenNthCalledWith( 6, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 4 }}});

            expect( store.commit ).toHaveBeenNthCalledWith( 7, "setActiveGroup", 2 );
        });

        it( "should request a rebuild of all tiles in the cache", async () => {
            cloneTile( store, activeDocument, 1 );

            await flushPromises();

            expect( mockFlushTileCache ).toHaveBeenCalledTimes( 1 );
            expect( mockRebuildAllTiles ).toHaveBeenCalledWith( activeDocument );
        });
    });

    describe( "when restoring a tile cloning step", () => {
        it( "should remove the cloned layers", () => {
            cloneTile( store, activeDocument, 2 );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", expect.any( Number ));
        });

        it( "should mark the originally active set as the active set", () => {
            cloneTile( store, activeDocument, 2 );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).toHaveBeenCalledWith( "setActiveGroup", 1 );
        });

        it( "should restore the original tile set indices when restoring a clone action between tile sets", () => {
            cloneTile( store, activeDocument, 1 );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();
            
            undo();

            // NOTE: we don't check for exact index numbers as the mocked store function do not update the document
            // checking for rel id should cover the use case though

            expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", expect.any( Number ));
            expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", expect.any( Number ) );
            expect( store.commit ).toHaveBeenNthCalledWith( 3, "removeLayer", expect.any( Number ) );

            // validate updated sets with ids 3 and 4 have moved back to 2 and 3
            
            expect( store.commit ).toHaveBeenNthCalledWith( 4, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 2 }}});
            expect( store.commit ).toHaveBeenNthCalledWith( 5, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 3 }}});
            expect( store.commit ).toHaveBeenNthCalledWith( 6, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 3 }}});

            expect( store.commit ).toHaveBeenNthCalledWith( 7, "setActiveGroup", 1 );
        });

        it( "should request a rebuild of all tiles in the cache", async () => {
            cloneTile( store, activeDocument, 1 );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();
            
            undo();

            await flushPromises();
            
            expect( mockFlushTileCache ).toHaveBeenCalledTimes( 1 );
            expect( mockRebuildAllTiles ).toHaveBeenCalledWith( activeDocument );
        });
    });
});