import { it, describe, expect, vi } from "vitest";
import type { Filters } from "@/model/types/filters";
import type { Mask } from "@/model/types/mask";
import type { Text } from "@/model/types/text";
import type { Transform } from "@/model/types/transform";
import { LayerTypes, DEFAULT_LAYER_NAME, DEFAULT_TEXT_LAYER_NAME } from "@/definitions/layer-types";
import FiltersFactory, { type FiltersProps } from "@/model/factories/filters-factory";
import LayerFactory, { layerToRect } from "@/model/factories/layer-factory";
import MaskFactory, { type MaskProps } from "@/model/factories/mask-factory";
import TextFactory, { type TextProps } from "@/model/factories/text-factory";
import TransformFactory, { type TransformProps } from "@/model/factories/transform-factory";
import { createMockCanvasElement } from "../../mocks";

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
            const mockFilters = FiltersFactory.create({ enabled: true });
            const mockTransform = TransformFactory.create({ scale: 0.5 });
            const mockText = TextFactory.create({ value: "lorem ipsum dolor sit amet" });

            vi.spyOn( FiltersFactory, "create" ).mockImplementation( () => mockFilters );
            vi.spyOn( TextFactory, "create" ).mockImplementation( () => mockText );
            vi.spyOn( TransformFactory, "create" ).mockImplementation( () => mockTransform );
            
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
                width: 1,
                height: 1,
                visible: true,
                text: mockText,
                transform: mockTransform,
                filters: mockFilters,
                rel: {
                    type: "none",
                },
            });
        });

        it( "should be able to create a layer from given arguments", () => {
            vi.spyOn( FiltersFactory, "create" ).mockImplementation(( args: FiltersProps ) => args as Filters );
            vi.spyOn( MaskFactory, "create" ).mockImplementation(( args: MaskProps ) => args as Mask );
            vi.spyOn( TextFactory, "create" ).mockImplementation(( args: TextProps ) => args as Text );
            vi.spyOn( TransformFactory, "create" ).mockImplementation(( args: TransformProps ) => args as Transform );
            
            mockUpdateFn = vi.fn(( _fn, data ) => data );

            const source = createMockCanvasElement();
            const maskSource = createMockCanvasElement();

            const layer = LayerFactory.create({
                name: "foo",
                type: LayerTypes.LAYER_IMAGE,
                transparent: false,
                source,
                mask: {
                    source: maskSource,
                    enabled: false,
                    left: 50,
                    top: 25,
                },
                left: 100,
                top: 50,
                width: 16,
                height: 9,
                visible: false,
                text: { value: "Lorem ipsum" },
                transform: { rotation: 270 },
                filters: { contrast: .7 },
                rel: {
                    type: "group",
                    id: "Foo",
                },
            });
            expect( layer ).toEqual({
                id: expect.any( String ),
                name: "foo",
                type: LayerTypes.LAYER_IMAGE,
                transparent: false,
                source,
                mask: {
                    source: maskSource,
                    enabled: false,
                    left: 50,
                    top: 25,
                },
                left: 100,
                top: 50,
                width: 16,
                height: 9,
                visible: false,
                text: { value: "Lorem ipsum" },
                transform: { rotation: 270 },
                filters: { contrast: .7 },
                rel: {
                    type: "group",
                    id: "Foo",
                },
            });
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
                mask: {
                    source: createMockCanvasElement( 150, 100 ),
                    enabled: false,
                    left: 30,
                    top: 20,
                },
                left: 100,
                top: 50,
                width: 16,
                height: 9,
                visible: false,
                text: { value: "Lorem ipsum" },
                transform: { rotation: 270 },
                filters: { contrast: .7 },
                rel: {
                    type: "tile",
                    id: 2,
                },
            });
            const serializeFiltersSpy = vi.spyOn( FiltersFactory, "serialize" ).mockImplementation( args => args );
            const deserializeFiltersSpy = vi.spyOn( FiltersFactory, "deserialize" ).mockImplementation( args => args );

            const serializeMaskSpy = vi.spyOn( MaskFactory, "serialize" ).mockImplementation( args => args );
            const deserializeMaskSpy = vi.spyOn( MaskFactory, "deserialize" ).mockImplementation( args => args );

            const serializeTextSpy = vi.spyOn( TextFactory, "serialize" ).mockImplementation( args => args );
            const deserializeTextSpy = vi.spyOn( TextFactory, "deserialize" ).mockImplementation( args => args );

            const serializeTransformSpy = vi.spyOn( TransformFactory, "serialize" ).mockImplementation( args => args );
            const deserializeTransformSpy = vi.spyOn( TransformFactory, "deserialize" ).mockImplementation( args => args );

            mockUpdateFn = vi.fn(( _fn, data ) => data );

            const serialized = LayerFactory.serialize( layer );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "imageToBase64", layer.source, layer.width, layer.height, layer.transparent );
            expect( serializeFiltersSpy ).toHaveBeenCalledWith( layer.filters );
            expect( serializeMaskSpy ).toHaveBeenCalledWith( layer.mask );
            expect( serializeTextSpy ).toHaveBeenCalledWith( layer.text );
            expect( serializeTransformSpy ).toHaveBeenCalledWith( layer.transform );
            
            mockUpdateFn = vi.fn(( _fn, data ) => data );
            const deserialized = await LayerFactory.deserialize( serialized );

            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "base64toCanvas", expect.any( Object ), layer.width, layer.height );
            expect( deserializeFiltersSpy ).toHaveBeenCalledWith( layer.filters );
            expect( deserializeMaskSpy ).toHaveBeenCalledWith( layer.mask );
            expect( deserializeTextSpy ).toHaveBeenCalledWith( layer.text );
            expect( deserializeTransformSpy ).toHaveBeenCalledWith( layer.transform );
            
            // note id's are unique per created session instance and therefor will differ
            expect({
                ...deserialized,
                id: expect.any( String ),
            }).toEqual({
                ...layer,
                id: expect.any( String ),
            });
        });

        it( "should deserialize with a default rel structure for legacy serialized layers", async () => {
            const serialized = LayerFactory.serialize( LayerFactory.create());
            delete serialized.r;

            const deserialized = await LayerFactory.deserialize( serialized );

            expect( deserialized.rel ).toEqual({
                type: "none",
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

    // MIGRATIONS

    describe( "and determining whether a migration needs to be applied", () => {
        describe( "and the version was serialised in FACTORY_VERSION < 2", () => {
            it( "should deserialise the legacy inline Mask values", async () => {
                const deserializeMaskSpy = vi.spyOn( MaskFactory, "deserialize" );
                
                const layer = LayerFactory.create({ width: 300, height: 200 });
                
                const serialized = LayerFactory.serialize( layer );
                serialized.fv = 1; // force legacy FACTORY_VERSION

                // mimic legacy mask structure
                serialized.m = createMockCanvasElement();
                serialized.x2 = 20;
                serialized.y2 = 30;

                mockUpdateFn = vi.fn(( _fn, data ) => data );

                deserializeMaskSpy.mockReset();

                const deserialized = await LayerFactory.deserialize( serialized );

                expect( deserializeMaskSpy ).not.toHaveBeenCalled();
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "base64toCanvas", expect.any( Object ), 300, 200 );

                expect( deserialized.mask ).toEqual({
                    source: expect.any( Object ),
                    enabled: true,
                    left: 20,
                    top: 30,
                });
            });

            it( "should ignore Layers without a serialised Mask", async () => {
                const layer = LayerFactory.create({ width: 300, height: 200 });

                const serialized = LayerFactory.serialize( layer );
                serialized.fv = 1; // force legacy FACTORY_VERSION

                const deserialized = await LayerFactory.deserialize( serialized );

                expect( deserialized.mask ).toBeNull();
            });
        });
    });
});
