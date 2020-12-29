import LayerFactory from "@/factories/layer-factory";
import { LAYER_GRAPHIC, LAYER_IMAGE, LAYER_MASK } from "@/definitions/layer-types";

let mockUpdateFn;
jest.mock( "@/utils/canvas-util", () => ({
    imageToBase64: (...args) => mockUpdateFn?.( "imageToBase64", ...args ),
    base64ToLayerImage: (...args) => mockUpdateFn?.( "base64ToLayerImage", ...args ),
}));
jest.mock( "@/factories/effects-factory", () => ({
    create: (...args) => mockUpdateFn?.( "create", ...args ),
    serialize: (...args) => mockUpdateFn?.( "serialize", ...args ),
    deserialize: (...args) => mockUpdateFn?.( "deserialize", ...args ),
}));

describe( "Layer factory", () => {
    describe( "when creating a new layer", () => {
        it( "should create a default Layer structure when no arguments are passed", () => {
            const mockEffects = { foo: "bar" };
            mockUpdateFn = fn => fn === "create" ? mockEffects : {};
            const layer = LayerFactory.create();
            expect( layer ).toEqual({
                id: expect.any( String ),
                name: expect.any( String ),
                type: LAYER_GRAPHIC,
                source: null,
                mask: null,
                x: 0,
                y: 0,
                maskX: 0,
                maskY: 0,
                width: 1,
                height: 1,
                visible: true,
                effects: mockEffects,
                selection: null,
            });
        });

        it( "should be able to create a layer from given arguments", () => {
            mockUpdateFn = ( fn, data ) => data;
            const layer = LayerFactory.create({
                name: "foo",
                type: LAYER_IMAGE,
                source: { src: "bitmap" },
                mask: { src: "mask" },
                x: 100,
                y: 50,
                maskX: 50,
                maskY: 25,
                width: 16,
                height: 9,
                visible: false,
                effects: {
                    rotation: 270,
                },
            });
            expect( layer ).toEqual({
                id: expect.any( String ),
                name: "foo",
                type: LAYER_IMAGE,
                source: { src: "bitmap" },
                mask: { src: "mask" },
                x: 100,
                y: 50,
                maskX: 50,
                maskY: 25,
                width: 16,
                height: 9,
                visible: false,
                effects: {
                    rotation: 270,
                },
                selection: null,
            })
        });
    });

    describe( "when serializing and deserializing a Layer", () => {
        it( "should do so without data loss", async () => {
            const layer = LayerFactory.create({
                name: "foo",
                type: LAYER_IMAGE,
                source: { src: "bitmap" },
                mask: { src: "mask" },
                x: 100,
                y: 50,
                width: 16,
                height: 9,
                visible: false,
                effects: {
                    rotation: -90,
                },
            });
            mockUpdateFn = jest.fn(( fn, data ) => data );

            const serialized = LayerFactory.serialize( layer );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "imageToBase64", layer.source, layer.width, layer.height );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "imageToBase64", layer.mask,   layer.width, layer.height );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "serialize", layer.effects );

            mockUpdateFn = jest.fn(( fn, data ) => data );
            const deserialized = await LayerFactory.deserialize( serialized );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "base64ToLayerImage", expect.any( Object ), LAYER_IMAGE, layer.width, layer.height );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "base64ToLayerImage", expect.any( Object ), LAYER_MASK, layer.width, layer.height );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "deserialize", layer.effects );

            // note id's are unique per created session instance and therefor will differ
            expect({
                ...deserialized,
                id: expect.any( String ),
            }).toEqual({
                ...layer,
                id: expect.any( String ),
            });
        });
    });
});
