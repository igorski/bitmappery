import LayerFactory from "@/factories/layer-factory";
import { LAYER_GRAPHIC, LAYER_IMAGE, LAYER_MASK } from "@/definitions/layer-types";

let mockUpdateFn;
jest.mock( "@/utils/canvas-util", () => ({
    imageToBase64: (...args) => mockUpdateFn?.( "imageToBase64", ...args ),
    base64ToLayerImage: (...args) => mockUpdateFn?.( "base64ToLayerImage", ...args ),
}));
jest.mock( "@/factories/effects-factory", () => ({
    create: (...args) => mockUpdateFn?.( "createEffect", ...args ),
    serialize: (...args) => mockUpdateFn?.( "serializeEffect", ...args ),
    deserialize: (...args) => mockUpdateFn?.( "deserializeEffect", ...args ),
}));
jest.mock( "@/factories/text-factory", () => ({
    create: (...args) => mockUpdateFn?.( "createText", ...args ),
    serialize: (...args) => mockUpdateFn?.( "serializeText", ...args ),
    deserialize: (...args) => mockUpdateFn?.( "deserializeText", ...args ),
}));

describe( "Layer factory", () => {
    describe( "when creating a new layer", () => {
        it( "should create a default Layer structure when no arguments are passed", () => {
            const mockEffects = { foo: "bar" };
            const mockText = { value: "lorem ipsum dolor sit amet" };
            mockUpdateFn = fn => {
                switch( fn ) {
                    default:
                        return {};
                    case "createEffect":
                        return mockEffects;
                    case "createText":
                        return mockText;
                }
            }
            const layer = LayerFactory.create();
            expect( layer ).toEqual({
                id: expect.any( String ),
                name: expect.any( String ),
                type: LAYER_GRAPHIC,
                transparent: true,
                source: null,
                mask: null,
                x: 0,
                y: 0,
                maskX: 0,
                maskY: 0,
                width: 1,
                height: 1,
                visible: true,
                text: mockText,
                effects: mockEffects,
                selection: null,
            });
        });

        it( "should be able to create a layer from given arguments", () => {
            mockUpdateFn = ( fn, data ) => data;
            const layer = LayerFactory.create({
                name: "foo",
                type: LAYER_IMAGE,
                transparent: false,
                source: { src: "bitmap" },
                mask: { src: "mask" },
                x: 100,
                y: 50,
                maskX: 50,
                maskY: 25,
                width: 16,
                height: 9,
                visible: false,
                text: {
                    value: "Lorem ipsum",
                },
                effects: {
                    rotation: 270,
                },
            });
            expect( layer ).toEqual({
                id: expect.any( String ),
                name: "foo",
                type: LAYER_IMAGE,
                transparent: false,
                source: { src: "bitmap" },
                mask: { src: "mask" },
                x: 100,
                y: 50,
                maskX: 50,
                maskY: 25,
                width: 16,
                height: 9,
                visible: false,
                text: {
                    value: "Lorem ipsum"
                },
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
                transparent: false,
                source: { src: "bitmap" },
                mask: { src: "mask" },
                x: 100,
                y: 50,
                width: 16,
                height: 9,
                visible: false,
                text: {
                    value: "Foo bar baz",
                },
                effects: {
                    rotation: -90,
                },
            });
            mockUpdateFn = jest.fn(( fn, data ) => data );

            const serialized = LayerFactory.serialize( layer );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "imageToBase64", layer.source, layer.width, layer.height, layer.transparent );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "imageToBase64", layer.mask,   layer.width, layer.height, true );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "serializeText", layer.text );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 4, "serializeEffect", layer.effects );

            mockUpdateFn = jest.fn(( fn, data ) => data );
            const deserialized = await LayerFactory.deserialize( serialized );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "base64ToLayerImage", expect.any( Object ), LAYER_IMAGE, layer.width, layer.height );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "base64ToLayerImage", expect.any( Object ), LAYER_MASK, layer.width, layer.height );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "deserializeText",    layer.text );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 4, "deserializeEffect",  layer.effects );

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
