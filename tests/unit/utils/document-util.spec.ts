import { it, describe, expect, beforeEach, vi } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../mocks";
import type { Document, Layer } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import TextFactory from "@/factories/text-factory";
import { cloneLayers, getAlignableObjects, restoreFromClone } from "@/utils/document-util";

mockZCanvas();

vi.mock( "@/utils/canvas-util", () => ({
    createCanvas : vi.fn().mockReturnValue({ cvs: {}, ctx: {}}),
    cloneCanvas: ( cvs: HTMLCanvasElement ): HTMLCanvasElement => cvs
}));

describe( "Document utilities", () => {
    describe( "When calculating the alignable objects within a document", () => {
        let document: Document;
        let width: number;
        let height: number;

        beforeEach(() => {
            document = DocumentFactory.create();
            ({ width, height } = document );
        });

        it( "should be able to calculate the documents horizontal and vertical center", () => {
            const alignableObjects = getAlignableObjects( document );
            expect( alignableObjects ).toEqual([
                { left: 0, top: height / 2, width, height: 0 }, // vertical document center
                { left: width / 2, top: 0, width: 0, height }   // horizontal document center
            ]);
        });

        it( "should ignore layers that are currently invisible", () => {
            const layer = LayerFactory.create({ left: 10, top: 10, width: width / 2, height: height / 2, visible: false });
            document.layers.push( layer );
            const alignableObjects = getAlignableObjects( document );
            expect( alignableObjects ).toEqual([
                { left: 0, top: height / 2, width, height: 0 }, // vertical document center
                { left: width / 2, top: 0, width: 0, height }   // horizontal document center
            ]);
        });

        it( "should ignore layers that occupy the same bounding box as the document to prevent duplicates", () => {
            document.layers.push( LayerFactory.create({ left: 0, top: 0, width, height }));
            const alignableObjects = getAlignableObjects( document );
            expect( alignableObjects ).toEqual([
                { left: 0, top: height / 2, width, height: 0 }, // vertical document center
                { left: width / 2, top: 0, width: 0, height }   // horizontal document center
            ]);
        });

        it( "should be able to calculate the horizontal and vertical center for each additional layer", () => {
            document.layers.push( LayerFactory.create({ left: 10, top: 10, width: width / 2, height: height / 2 }));
            const alignableObjects = getAlignableObjects( document );
            expect( alignableObjects ).toEqual([
                { left: 0, top: height / 2, width, height: 0 }, // vertical document center
                { left: width / 2, top: 0, width: 0, height },  // horizontal document center
                // added layer
                { left: 0,   top: 10,  width, height: 0 }, // vertical layer top
                { left: 0,   top: 260, width, height: 0 }, // vertical layer center
                { left: 0,   top: 510, width, height: 0 }, // vertical layer bottom
                { left: 10,  top: 0,   width: 0, height }, // horizontal layer left
                { left: 260, top: 0,   width: 0, height }, // horizontal layer center
                { left: 510, top: 0,   width: 0, height }, // horizontal layer right
            ]);
        });

        it( "should ignore the optionally provided layer to exclude", () => {
            const layer = LayerFactory.create({ left: 10, top: 10, width: width / 2, height: height / 2 });
            document.layers.push( layer );
            const alignableObjects = getAlignableObjects( document, layer );
            expect( alignableObjects ).toEqual([
                { left: 0, top: height / 2, width, height: 0 }, // vertical document center
                { left: width / 2, top: 0, width: 0, height }   // horizontal document center
            ]);
        });
    });

    it( "Should be able to clone and restore a Documents Layers contents", () => {
        const layer1mask   = createMockCanvasElement();
        const layer1source = createMockCanvasElement();
        const layer1props  = {
            left: 1, top: 2, width: 3, height: 4, maskX: 5, maskY: 6, mask: layer1mask, source: layer1source,
            text: TextFactory.create({ value: "foo bar" }),
        };
        const layer2mask  = createMockCanvasElement();
        const layer2source = createMockCanvasElement();
        const layer2props  = {
            left: -5, top: -5, width: 10, height: 15, maskX: 0, maskY: 0, mask: layer2mask, source: layer2source
        };
        
        const layer1 = LayerFactory.create( layer1props );
        const layer2 = LayerFactory.create( layer2props );

        // create document
        const document = DocumentFactory.create({ layers: [ layer1, layer2 ]});

        // clone document content
        const clonedLayers = cloneLayers( document );
        
        // adjust document data
        for ( const layer of document.layers ) {
            layer.left   = 10;
            layer.top    = 10;
            layer.width  = 30;
            layer.height = 40;
            layer.maskX  = 100;
            layer.maskY  = 100;
            layer.text   = TextFactory.create({ value: "baz qux" });
            layer.source = createMockCanvasElement();
            layer.mask   = createMockCanvasElement();
        }

        // restore clone
        restoreFromClone( document, clonedLayers );

        // assert properties have been restored

        Object.entries( layer1props ).forEach(([ key, value ]) => {
            expect( layer1[ key as keyof Layer ]).toEqual( value );
        });

        Object.entries( layer2props ).forEach(([ key, value ]) => {
            expect( layer2[ key as keyof Layer ]).toEqual( value );
        });
    });
});
