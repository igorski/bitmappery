import { getAlignableObjects } from "@/utils/document-util";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";

describe( "Document utilities", () => {
    describe( "When calculating the alignable objects within a document", () => {
        let document, width, height;

        beforeEach(() => {
            document = DocumentFactory.create();
            ({ width, height } = document );
        });

        it( "should be able to calculate the documents horizontal and vertical center", () => {
            const alignableObjects = getAlignableObjects( document );
            expect( alignableObjects ).toEqual([
                { x: 0, y: height / 2, width, height: 0 }, // vertical document center
                { x: width / 2, y: 0, width: 0, height }   // horizontal document center
            ]);
        });

        it( "should ignore layers that occupy the same bounding box as the document to prevent duplicates", () => {
            document.layers.push( LayerFactory.create({ x: 0, y: 0, width, height }));
            const alignableObjects = getAlignableObjects( document );
            expect( alignableObjects ).toEqual([
                { x: 0, y: height / 2, width, height: 0 }, // vertical document center
                { x: width / 2, y: 0, width: 0, height }   // horizontal document center
            ]);
        });

        it( "should be able to calculate the horizontal and vertical center for each additional layer", () => {
            document.layers.push( LayerFactory.create({ x: 10, y: 10, width: width / 2, height: height / 2 }));
            const alignableObjects = getAlignableObjects( document );
            expect( alignableObjects ).toEqual([
                { x: 0, y: height / 2, width, height: 0 }, // vertical document center
                { x: width / 2, y: 0, width: 0, height },  // horizontal document center
                // added layer
                { x: 0,   y: 10,  width, height: 0 }, // vertical layer top
                { x: 0,   y: 260, width, height: 0 }, // vertical layer center
                { x: 0,   y: 510, width, height: 0 }, // vertical layer bottom
                { x: 10,  y: 0,   width: 0, height }, // horizontal layer left
                { x: 260, y: 0,   width: 0, height }, // horizontal layer center
                { x: 510, y: 0,   width: 0, height }, // horizontal layer right
            ]);
        });

        it( "should ignore the optionally provided layer to exclude", () => {
            const layer = LayerFactory.create({ x: 10, y: 10, width: width / 2, height: height / 2 });
            document.layers.push( layer );
            const alignableObjects = getAlignableObjects( document, layer );
            expect( alignableObjects ).toEqual([
                { x: 0, y: height / 2, width, height: 0 }, // vertical document center
                { x: width / 2, y: 0, width: 0, height }   // horizontal document center
            ]);
        });
    });
});
