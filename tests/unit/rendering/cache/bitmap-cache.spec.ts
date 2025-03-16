import { it, describe, expect, vi } from "vitest";
import {
    getLayerCache, setLayerCache, hasLayerCache, clearCacheProperty,
    flushLayerCache, flushBitmapCache
} from "@/rendering/cache/bitmap-cache";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import TextFactory from "@/factories/text-factory";

vi.mock( "@/utils/canvas-util", () => ({}));

describe( "Bitmap cache", () => {
    const layer = LayerFactory.create();
    const data  = { text: TextFactory.create({ value: "bar" }) };

    describe( "when registering a cache for an individual layer", () => {
        it( "should by default not have a cache entry", () => {
            expect( hasLayerCache( layer )).toBe( false );
            expect( getLayerCache( layer )).toBeUndefined();
        });

        it( "should be able to register a new entry for the layer", () => {
            setLayerCache( layer, data );
            expect( hasLayerCache( layer )).toBe( true );
            expect( getLayerCache( layer )).toEqual( data );
        });

        it( "should be able to append new properties to a layers cache", () => {
            const newProperty = { filters: FiltersFactory.create({ opacity: 0.5 }) };
            setLayerCache( layer, newProperty );
            expect( getLayerCache( layer )).toEqual({ ...data, ...newProperty });
        });

        it( "should be able to update existing properties within a layers cache", () => {
            const updatedProperty = { filters: FiltersFactory.create({ opacity: 0.25 }) };
            setLayerCache( layer, updatedProperty );
            expect( getLayerCache( layer )).toEqual({ ...data, ...updatedProperty });
        });

        it( "should be able to remove individual properties from a layers cache", () => {
            clearCacheProperty( layer, "filters" );
            expect( getLayerCache( layer )).toEqual( data );
        });

        it( "should be able to remove an existing entry for a layer", () => {
            flushLayerCache( layer );
            expect( hasLayerCache( layer )).toBe( false );
            expect( getLayerCache( layer )).toBeUndefined();
        });
    });

    describe( "when removing a cache", () => {
        it( "should be able to flush individual layer caches", () => {
            const layer1     = LayerFactory.create();
            const layer1data = { text: TextFactory.create({ value: "bar" }) };
            const layer2     = LayerFactory.create();
            const layer2data = { text: TextFactory.create({ value: "qux" }) };

            setLayerCache( layer1, layer1data );
            setLayerCache( layer2, layer2data );

            expect( hasLayerCache( layer1 )).toBe( true );
            expect( hasLayerCache( layer2 )).toBe( true );

            flushLayerCache( layer1 );

            expect( hasLayerCache( layer1 )).toBe( false );
            expect( hasLayerCache( layer2 )).toBe( true );

            flushLayerCache( layer2 );

            expect( hasLayerCache( layer2 )).toBe( false );
        });

        it( "should be able to flush all caches in their entierity", () => {
            const layer1     = LayerFactory.create();
            const layer1data = { text: TextFactory.create({ value: "bar" }) };
            const layer2     = LayerFactory.create();
            const layer2data = { text: TextFactory.create({ value: "qux" }) };

            setLayerCache( layer1, layer1data );
            setLayerCache( layer2, layer2data );

            expect( hasLayerCache( layer1 )).toBe( true );
            expect( hasLayerCache( layer2 )).toBe( true );

            flushBitmapCache();

            expect( hasLayerCache( layer1 )).toBe( false );
            expect( hasLayerCache( layer2 )).toBe( false );
        });
    });
});
