import { it, describe, expect, vi } from "vitest";
import type { Transform, Filters, Text } from "@/definitions/document";
import { LayerTypes, DEFAULT_LAYER_NAME, DEFAULT_TEXT_LAYER_NAME } from "@/definitions/layer-types";
import TransformFactory, { type TransformProps } from "@/factories/transform-factory";
import FiltersFactory, { type FiltersProps } from "@/factories/filters-factory";
import LayerFactory, { layerToRect } from "@/factories/layer-factory";
import TextFactory, { type TextProps } from "@/factories/text-factory";
import { createMockCanvasElement } from "../mocks";

let mockUpdateFn: ( fnName: string, ...args: any[] ) => void;
vi.mock( "@/utils/canvas-util", () => ({
    createCanvas: () => ({
        cvs: {},
    }),
    imageToBase64: (...args: any[]) => mockUpdateFn?.( "imageToBase64", ...args ),
    base64toCanvas: (...args: any[]) => mockUpdateFn?.( "base64toCanvas", ...args ),
}));

describe( "Layer factory", () => {
    describe( "when creating a new layer", () => {
        it( "should create a default Layer structure when no arguments are passed", () => {
            const mockTransform = TransformFactory.create({ scale: 0.5 });
            const mockFilters = FiltersFactory.create({ enabled: true });
            const mockText = TextFactory.create({ value: "lorem ipsum dolor sit amet" });

            vi.spyOn( TextFactory, "create" ).mockImplementation( () => mockText );
            vi.spyOn( TransformFactory, "create" ).mockImplementation( () => mockTransform );
            vi.spyOn( FiltersFactory, "create" ).mockImplementation( () => mockFilters );

            const layer = LayerFactory.create();
            expect( layer ).toEqual({
                id: expect.any( String ),
                name: expect.any( String ),
                type: LayerTypes.LAYER_GRAPHIC,
                transparent: true,
                source: null,
                mask: null,
                left: 0,
                top: 0,
                maskX: 0,
                maskY: 0,
                width: 1,
                height: 1,
                visible: true,
                text: mockText,
                transform: mockTransform,
                filters: mockFilters,
            });
        });

        it( "should be able to create a layer from given arguments", () => {
            vi.spyOn( TextFactory, "create" ).mockImplementation(( args: TextProps ) => args as Text );
            vi.spyOn( TransformFactory, "create" ).mockImplementation(( args: TransformProps ) => args as Transform );
            vi.spyOn( FiltersFactory, "create" ).mockImplementation(( args: FiltersProps ) => args as Filters );

            mockUpdateFn = ( _fn, data ) => data;

            const source = createMockCanvasElement();
            const mask = createMockCanvasElement();

            const layer = LayerFactory.create({
                name: "foo",
                type: LayerTypes.LAYER_IMAGE,
                transparent: false,
                source,
                mask,
                left: 100,
                top: 50,
                maskX: 50,
                maskY: 25,
                width: 16,
                height: 9,
                visible: false,
                text: { value: "Lorem ipsum" },
                transform: { rotation: 270 },
                filters: { contrast: .7 }
            });
            expect( layer ).toEqual({
                id: expect.any( String ),
                name: "foo",
                type: LayerTypes.LAYER_IMAGE,
                transparent: false,
                source,
                mask,
                left: 100,
                top: 50,
                maskX: 50,
                maskY: 25,
                width: 16,
                height: 9,
                visible: false,
                text: { value: "Lorem ipsum" },
                transform: { rotation: 270 },
                filters: { contrast: .7 },
            })
        });

        describe( "and providing a name to the Layer", () => {
            it( "should take the default name when none was provided", () => {
                const layer = LayerFactory.create();

                expect( layer.name ).toEqual( DEFAULT_LAYER_NAME );
            });

            it( "should take the default name for Text layers when none was provided", () => {
                const layer = LayerFactory.create({ type: LayerTypes.LAYER_TEXT });

                expect( layer.name ).toEqual( DEFAULT_TEXT_LAYER_NAME );
            });

            it( "should take the provided name", () => {
                const layer = LayerFactory.create({ type: LayerTypes.LAYER_TEXT, name: "Billay Bawb" });

                expect( layer.name ).toEqual( "Billay Bawb" );
            });
        });
    });

    describe( "when serializing and deserializing a Layer", () => {
        it( "should do so without data loss", async () => {
            const layer = LayerFactory.create({
                name: "foo",
                type: LayerTypes.LAYER_IMAGE,
                transparent: false,
                source: createMockCanvasElement(),
                mask: createMockCanvasElement(),
                left: 100,
                top: 50,
                width: 16,
                height: 9,
                visible: false,
                text: { value: "Lorem ipsum" },
                transform: { rotation: 270 },
                filters: { contrast: .7 }
            });
            const serializeTextSpy = vi.spyOn( TextFactory, "serialize" ).mockImplementation( args => args );
            const deserializeTextSpy = vi.spyOn( TextFactory, "deserialize" ).mockImplementation( args => args );

            const serializeTransformSpy = vi.spyOn( TransformFactory, "serialize" ).mockImplementation( args => args );
            const deserializeTransformSpy = vi.spyOn( TransformFactory, "deserialize" ).mockImplementation( args => args );

            const serializeFiltersSpy = vi.spyOn( FiltersFactory, "serialize" ).mockImplementation( args => args );
            const deserializeFiltersSpy = vi.spyOn( FiltersFactory, "deserialize" ).mockImplementation( args => args );

            mockUpdateFn = vi.fn(( _fn, data ) => data );

            const serialized = LayerFactory.serialize( layer );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "imageToBase64", layer.source, layer.width, layer.height, layer.transparent );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "imageToBase64", layer.mask,   layer.width, layer.height, true );
            expect( serializeTextSpy ).toHaveBeenCalledWith( layer.text );
            expect( serializeTransformSpy ).toHaveBeenCalledWith( layer.transform );
            expect( serializeFiltersSpy ).toHaveBeenCalledWith( layer.filters );

            mockUpdateFn = vi.fn(( _fn, data ) => data );
            const deserialized = await LayerFactory.deserialize( serialized );

            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "base64toCanvas", expect.any( Object ), layer.width, layer.height );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "base64toCanvas", expect.any( Object ), layer.width, layer.height );
            expect( deserializeTextSpy ).toHaveBeenCalledWith( layer.text );
            expect( deserializeTransformSpy ).toHaveBeenCalledWith( layer.transform );
            expect( deserializeFiltersSpy ).toHaveBeenCalledWith( layer.filters );

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

    it( "should be able to return a rectangle for a Layer", () => {
        const layer = LayerFactory.create({
            name   : "foo",
            left   : 100,
            top    : 50,
            width  : 16,
            height : 9
        });
        expect( layerToRect( layer )).toEqual({
            left   : 100,
            top    : 50,
            width  : 16,
            height : 9
        });
    });
});
