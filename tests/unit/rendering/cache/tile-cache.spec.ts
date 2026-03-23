import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockZCanvas } from "../../mocks";
mockZCanvas();

import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import {
    createGroupTile,
    hasTile,
    flushTileForGroup,
    flushTileCache,
    getTileForGroup,
    subscribe,
    unsubscribe,
} from "@/rendering/cache/tile-cache";

vi.mock( "@/utils/document-util", () => ({
    createGroupSnapshot: vi.fn().mockResolvedValue(({ mock: "canvas" })),
}));

describe( "Tile cache", () => {
    const layers = [
        LayerFactory.create({ rel: { id: 0, type: "tile" }}),
        LayerFactory.create({ rel: { id: 1, type: "tile" }}),
        LayerFactory.create({ rel: { id: 1, type: "tile" }}),
    ];
    const document = DocumentFactory.create({
        layers,
        type: "timeline",
    });

    afterEach(() => {
        flushTileCache();
    });

    describe( "when subscribing to updates of the cache", () => {
        const SUBSCRIBE_TOKEN = "test";
        const updateFn = vi.fn();

        beforeEach(() => {
            subscribe( SUBSCRIBE_TOKEN, updateFn );
        });

        afterEach(() => {
            unsubscribe( SUBSCRIBE_TOKEN );
            updateFn.mockReset();
        });

        it( "should receive an update on cache completion", async () => {
            await createGroupTile( 0, document );
 
            expect( updateFn ).toHaveBeenCalledWith( 0, { mock: "canvas" });
        });

        it( "should no longer receive updates on unsubscribe", async () => {
            unsubscribe( SUBSCRIBE_TOKEN );

            await createGroupTile( 0, document );
            
            expect( updateFn ).not.toHaveBeenCalled();
        });
    });

    describe( "when managing the tile cache for a Layer group", () => {
        it( "should by default not have a tile when there is no cache", () => {
            expect( hasTile( 0 )).toBe( false );
        });

        it( "should have a cached tile after initial creation", async () => {
            await createGroupTile( 0, document );

            expect( hasTile( 0 )).toBe( true );
        });

        it( "should be able to remove the cache for an individual Layer group", async () => {
            await createGroupTile( 0, document );
            await createGroupTile( 1, document );

            expect( hasTile( 0 )).toBe( true );
            expect( hasTile( 1 )).toBe( true );

            flushTileForGroup( 0 );

            expect( hasTile( 0 )).toBe( false );
            expect( hasTile( 1 )).toBe( true );
        });

        it( "should be able to remove the cache for all Layer groups", async () => {
            await createGroupTile( 0, document );
            await createGroupTile( 1, document );

            expect( hasTile( 0 )).toBe( true );
            expect( hasTile( 1 )).toBe( true );

            flushTileCache();

            expect( hasTile( 0 )).toBe( false );
            expect( hasTile( 1 )).toBe( false );
        });

        it( "should return a thumbnail image when the caching has completed", async () => {
            await createGroupTile( 0, document );

            const thumb = getTileForGroup( 0 );

            expect( thumb ).toEqual({ mock: "canvas" });
        });
    });
});