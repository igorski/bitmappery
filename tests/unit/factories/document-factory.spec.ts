import { it, describe, expect, afterAll, vi } from "vitest";
import { mockZCanvas } from "../mocks";
import type { Layer, Selection } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";

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
                activeSelection: [],
                invertSelection: false,
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
                selections: { foo: [[ { x: 0, y: 0 } ]] }
            });
            expect( document ).toEqual({
                id: expect.any( String ),
                name: "foo",
                width: 1200,
                height: 900,
                layers,
                selections: { foo: [[ { x: 0, y: 0 } ]] },
                activeSelection: [],
                invertSelection: false,
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
                selections
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
    });
});
