import { it, afterEach, describe, expect } from "vitest";
import {
    isBlendCached, getBlendCache, cacheBlendedLayer, flushBlendedLayerCache,
} from "@/rendering/cache/blended-layer-cache";
import { createMockCanvasElement } from "../../mocks";

describe( "Blended layer cache", () => {
    const cachedBitmap = createMockCanvasElement();

    afterEach(() => {
        flushBlendedLayerCache();
    });

    describe( "when determining whether a layer is considered cached within the layer cache", () => {
        it( "should by default return false when there is no cache", () => {
            expect( isBlendCached( 0 )).toBe( false );
        });

        it( "should return true for layers below the cached layer index", () => {
            cacheBlendedLayer( 2, cachedBitmap );

            expect( isBlendCached( 0 )).toBe( true );
            expect( isBlendCached( 1 )).toBe( true );
        });

        it( "should return false for the layer at the cached index", () => {
            cacheBlendedLayer( 2, cachedBitmap );

            expect( isBlendCached( 2 )).toBe( false );
        });

        it( "should return false for layers above the cached layer index", () => {
            cacheBlendedLayer( 2, cachedBitmap );

            expect( isBlendCached( 3 )).toBe( false );
        });
    });

    describe( "when caching and retrieving a layers blended bitmap", () => {
        it( "should by default not be able to retrieve a non-cached bitmap", () => {
            expect( getBlendCache( 0 )).toBeUndefined();
        });

        it( "should be able to store the cached bitmap for a layer index", () => {
            cacheBlendedLayer( 2, cachedBitmap );

            expect( getBlendCache( 2 )).toEqual( cachedBitmap );
        });

        it( "should not be able to retrieve a cached bitmap for a layer of a different index than the cached one", () => {
            cacheBlendedLayer( 2, cachedBitmap );

            expect( getBlendCache( 0 )).toBeUndefined();
            expect( getBlendCache( 1 )).toBeUndefined();
            expect( getBlendCache( 3 )).toBeUndefined();
        });

        it( "should be able to flush the existing cached bitmap", () => {
            cacheBlendedLayer( 2, cachedBitmap );

            flushBlendedLayerCache();

            expect( getBlendCache( 2 )).toBeUndefined();
        });
    });

    describe( "when handle the cache for a document with multiple layers containing blend filters", () => {
        it( "should be able to store a cached bitmap for a layer at a higher index than the previously cached one", () => {
            cacheBlendedLayer( 2, cachedBitmap );
            cacheBlendedLayer( 3, cachedBitmap );

            expect( isBlendCached( 2 )).toBe( true );
            expect( isBlendCached( 3 )).toBe( false );

            expect( getBlendCache( 2 )).toBeUndefined();
            expect( getBlendCache( 3 )).toEqual( cachedBitmap );
        });
    });
});