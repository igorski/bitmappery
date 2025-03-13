import { it, afterEach, describe, expect } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../../mocks";
mockZCanvas();

import LayerFactory from "@/factories/layer-factory";
import {
    cacheBlendedLayer, flushBlendedLayerCache, getBlendCache, getBlendableLayers,
    isBlendCached, pauseBlendCaching, setBlendCaching, useBlendCaching,
} from "@/rendering/cache/blended-layer-cache";

describe( "Blended layer cache", () => {
    const cachedBitmap = createMockCanvasElement();

    afterEach(() => {
        pauseBlendCaching( 0, false );
        flushBlendedLayerCache();
        setBlendCaching( false );
    });

    describe( "when toggling the state of the cache", () => {
        it( "should by default not cache the Document", () => {
            expect( useBlendCaching() ).toBe( false );
        });

        it( "should cache the document when enabled", () => {
            setBlendCaching( true );

            expect( useBlendCaching() ).toBe( true );
        });

        it( "should store the provided list of blendable layers by their indices", () => {
            const layer1 = LayerFactory.create();
            const layer2 = LayerFactory.create();

            setBlendCaching( true, [ layer1, layer2 ]);

            expect( getBlendableLayers() ).toEqual([ 0, 1 ]);
        });

        it( "should unset the existing cache when disabling a previously enabled cache for a Document", () => {
            setBlendCaching( true );

            cacheBlendedLayer( 1, cachedBitmap );

            setBlendCaching( false );

            expect( isBlendCached( 0 )).toBe( false );
        });

        it( "should not unset the cache state when flushing the existing cache", () => {
            setBlendCaching( true );

            cacheBlendedLayer( 1, cachedBitmap );
            flushBlendedLayerCache();

            expect( useBlendCaching() ).toBe( true );
        });
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

    describe( "when handling the cache for a document with multiple layers containing blend filters", () => {
        it( "should be able to store a cached bitmap for a layer at a higher index than the previously cached one", () => {
            cacheBlendedLayer( 2, cachedBitmap );
            cacheBlendedLayer( 3, cachedBitmap );

            expect( isBlendCached( 2 )).toBe( true );
            expect( isBlendCached( 3 )).toBe( false );

            expect( getBlendCache( 2 )).toBeUndefined();
            expect( getBlendCache( 3 )).toEqual( cachedBitmap );
        });
    });

    describe( "when pausing the cache status", () => {
        it( "should not cache the document when it is enabled, but paused", () => {
            setBlendCaching( true );

            cacheBlendedLayer( 2, cachedBitmap );
            
            pauseBlendCaching( 2, true );

            expect( useBlendCaching() ).toBe( false );
        });

        it( "should allow pausing the cache when the request is made by a layer below the blend index", () => {
            setBlendCaching( true );

            cacheBlendedLayer( 1, cachedBitmap );
            
            pauseBlendCaching( 0, true );

            expect( useBlendCaching() ).toBe( false );
        });

        it( "should allow pausing the cache when the request is made by the layer equal to the blend index", () => {
            setBlendCaching( true );

            cacheBlendedLayer( 1, cachedBitmap );
            
            pauseBlendCaching( 1, true );

            expect( useBlendCaching() ).toBe( false );
        });

        it( "should not allow pausing the cache when the request is made by a layer above the blend index", () => {
            setBlendCaching( true );

            cacheBlendedLayer( 1, cachedBitmap );
            
            pauseBlendCaching( 2, true );

            expect( useBlendCaching() ).toBe( true );
        });

        it( "should allow caching again when unpausing a previously paused cache", () => {
            setBlendCaching( true );

            cacheBlendedLayer( 1, cachedBitmap );
            
            pauseBlendCaching( 1, true );
            pauseBlendCaching( 1, false );

            expect( useBlendCaching() ).toBe( true );
        });

        it( "should flush the cache when unpausing a previously paused cache", () => {
            setBlendCaching( true );

            cacheBlendedLayer( 1, cachedBitmap );
            
            pauseBlendCaching( 1, true );
            pauseBlendCaching( 1, false );

            expect( getBlendCache( 1 )).toBeUndefined();
        });
    });
});