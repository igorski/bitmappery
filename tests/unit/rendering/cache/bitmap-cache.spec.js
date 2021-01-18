import {
    getLayerCache, setLayerCache, hasLayerCache, clearCacheProperty,
    flushLayerCache, flushCache
} from "@/rendering/cache/bitmap-cache";
import LayerFactory from "@/factories/layer-factory";

jest.mock( "@/utils/canvas-util", () => ({}));

describe( "Bitmap cache", () => {
    const layer = LayerFactory.create();
    const data  = { foo: "bar" };

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
            setLayerCache( layer, { baz: "qux" });
            expect( getLayerCache( layer )).toEqual({ foo: "bar", baz: "qux" });
        });

        it( "should be able to update existing properties in a layers cache", () => {
            setLayerCache( layer, { baz: "quux" });
            expect( getLayerCache( layer )).toEqual({ foo: "bar", baz: "quux" });
        });

        it( "should be able to remove individual properties from a layers cache", () => {
            clearCacheProperty( layer, "baz" );
            expect( getLayerCache( layer )).toEqual({ foo: "bar" });
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
            const layer1data = { foo: "bar" };
            const layer2     = LayerFactory.create();
            const layer2data = { baz: "qux" };

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
            const layer1data = { foo: "bar" };
            const layer2     = LayerFactory.create();
            const layer2data = { baz: "qux" };

            setLayerCache( layer1, layer1data );
            setLayerCache( layer2, layer2data );

            expect( hasLayerCache( layer1 )).toBe( true );
            expect( hasLayerCache( layer2 )).toBe( true );

            flushCache();

            expect( hasLayerCache( layer1 )).toBe( false );
            expect( hasLayerCache( layer2 )).toBe( false );
        });
    });
});
