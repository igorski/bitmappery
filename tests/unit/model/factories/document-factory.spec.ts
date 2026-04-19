import { it, describe, expect, afterAll, vi } from "vitest";
import { mockZCanvas } from "../../mocks";
import type { Layer } from "@/model/types/layer";
import type { Selection } from "@/model/types/selection";
import { DEFAULT_DPI, DEFAULT_UNIT } from "@/definitions/document-presets";
import DocumentFactory from "@/model/factories/document-factory";
import LayerFactory from "@/model/factories/layer-factory";

vi.mock( "@/workers/compression.worker", () => ({
    // nowt... just to resolve import issue
}));
mockZCanvas();

describe( "Document factory", () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    describe( "when creating a new Document", () => {
        it( "should create a default Document structure with one default layer when no arguments are passed", () => {
            vi.spyOn( LayerFactory, "create" ).mockImplementation(() => ({ name: "layer1" } as unknown as Layer ));
            const document = DocumentFactory.create();
            expect( document ).toEqual({
                id: expect.any( String ),
                name: "New document",
                width: 1000,
                height: 1000,
                layers: [ { name: "layer1" } ],
                selections: {},
                type: "default",
                meta: {
                    dpi: DEFAULT_DPI,
                    unit: DEFAULT_UNIT,
                    swatches: [],
                },
                activeSelection: [],
                invertSelection: false,
                groups: [],
            });
        });

        it( "should be able to create a Document from given arguments", () => {
            const layers = [
                LayerFactory.create({ name: "layer1" }),
                LayerFactory.create({ name: "layer2" })
            ];
            const document = DocumentFactory.create({
                name: "foo",
                width: 1200,
                height: 900,
                layers,
                type: "timeline",
                meta: {
                    fps: 15,
                    bgColor: "#FF0000",
                    dpi: 300,
                    unit: "cm",
                    swatches: [ "#FF0000", "#00FF00" ],
                },
                selections: { foo: [[ { x: 0, y: 0 } ]] },
            });
            expect( document ).toEqual({
                id: expect.any( String ),
                name: "foo",
                width: 1200,
                height: 900,
                layers,
                selections: { foo: [[ { x: 0, y: 0 } ]] },
                type: "timeline",
                meta: {
                    fps: 15,
                    bgColor: "#FF0000",
                    dpi: 300,
                    unit: "cm",
                    swatches: [ "#FF0000", "#00FF00" ],
                },
                activeSelection: [],
                invertSelection: false,
                groups: [],
            });
        });
    });

    describe( "when serializing and deserializing a Document", () => {
        it( "should do so without data loss", async () => {
            const layers = [
                LayerFactory.create({ name: "layer1" }),
                LayerFactory.create({ name: "layer2" })
            ];
            const selections = {
                foo: [ [ { x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 } ] ],
                bar: [] as Selection
            };
            const document = DocumentFactory.create({
                name: "foo",
                width: 1200,
                height: 900,
                layers,
                selections,
                type: "timeline",
                meta: {
                    fps: 15,
                    bgColor: "#FF0000",
                    dpi: 300,
                    unit: "cm",
                    swatches: [ "#FF0000", "#00FF00" ],
                },
            });
            const serializeLayerSpy = vi.spyOn( LayerFactory, "serialize" ).mockImplementation( data => JSON.stringify( data ));
            const deserializeLayerSpy = vi.spyOn( LayerFactory, "deserialize" ).mockImplementation( data => JSON.parse( data ));

            const serialized = DocumentFactory.serialize( document );

            expect( serializeLayerSpy ).toHaveBeenNthCalledWith( 1, layers[ 0 ], 0, layers );
            expect( serializeLayerSpy ).toHaveBeenNthCalledWith( 2, layers[ 1 ], 1, layers );

            const deserialized = await DocumentFactory.deserialize( serialized );

            expect( deserializeLayerSpy ).toHaveBeenNthCalledWith( 1, expect.any( String ));
            expect( deserializeLayerSpy ).toHaveBeenNthCalledWith( 2, expect.any( String ));

            // note id's are unique per created session instance and therefor will differ
            expect({
                ...deserialized,
                id: expect.any( String )
            }).toEqual({
                ...document,
                id: expect.any( String )
            })
        });

        it( "should default to the 'default' type for legacy documents", async () => {
            const document = DocumentFactory.create();

            const serialized = DocumentFactory.serialize( document );
            delete serialized.t;

            const deserialized = await DocumentFactory.deserialize( serialized );

            expect( deserialized.type ).toEqual( "default" );
        });

        it( "should create an empty meta structure containing only the default DPI and unit values with an empty swatches list for legacy documents", async () => {
            const document = DocumentFactory.create();

            const serialized = DocumentFactory.serialize( document );
            delete serialized.m;

            const deserialized = await DocumentFactory.deserialize( serialized );

            expect( deserialized.meta ).toEqual({
                dpi: DEFAULT_DPI,
                unit: DEFAULT_UNIT,
                swatches: [],
            });
        });

        it( "should be able to serialize and deserialize export options for the Document", async () => {
            const document = DocumentFactory.create({
                meta: {
                    dpi: DEFAULT_DPI,
                    unit: DEFAULT_UNIT,
                    export: {
                        mime: "image/webp",
                        quality: 50,
                        sheetCols: 8,
                        type: "spritesheet"
                    },
                },
            });

            const serialized = DocumentFactory.serialize( document );
            const deserialized = await DocumentFactory.deserialize( serialized );

            expect( deserialized.meta ).toEqual({
                dpi: DEFAULT_DPI,
                unit: DEFAULT_UNIT,
                swatches: [],
                export: {
                    mime: "image/webp",
                    quality: 50,
                    sheetCols: 8,
                    type: "spritesheet"
                },
            });
        });
    });
});
