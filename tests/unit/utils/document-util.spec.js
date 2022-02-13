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
});
