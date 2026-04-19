import { it, describe, expect } from "vitest";
import { mockZCanvas } from "../mocks";

mockZCanvas();

import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import {
    getAllTileGroupsInDocument,
    getLayersByTile,
    getIndexOfFirstLayerInTileGroup,
    getIndexOfLastLayerInTileGroup,
    getTileByLayer,
    getPreviousTile,
    getNextTile,
} from "@/utils/timeline-util";

describe( "Timeline utilities", () => {
    const tile1Layer1 = LayerFactory.create({ rel: { type: "tile", id: 0 }});
    const tile1Layer2 = LayerFactory.create({ rel: { type: "tile", id: 0 }});

    const tile2Layer1 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2Layer2 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2Layer3 = LayerFactory.create({ rel: { type: "tile", id: 1 }});

    const tile3Layer1 = LayerFactory.create({ rel: { type: "tile", id: 2 }});

    const activeDocument = DocumentFactory.create({
        layers: [
            tile1Layer1, tile1Layer2,
            tile2Layer1, tile2Layer2, tile2Layer3,
            tile3Layer1,
        ]
    });

    it( "should be able to retrieve all unique Layer group ids from a Document", () => {
        expect( getAllTileGroupsInDocument( activeDocument )).toEqual([ 0, 1, 2 ]);
    });

    it( "should be able to retrieve all Layers by their tile grouping", () => {
        const tile1group = getLayersByTile( activeDocument, 0 );
        const tile2group = getLayersByTile( activeDocument, 1 );
        const tile3group = getLayersByTile( activeDocument, 2 );

        expect( tile1group ).toEqual([ tile1Layer1, tile1Layer2 ]);
        expect( tile2group ).toEqual([ tile2Layer1, tile2Layer2, tile2Layer3 ]);
        expect( tile3group ).toEqual([ tile3Layer1 ]);
    });

    it( "should be able to get the indices of the first Layer within a tile group, relative to the Document layer list", () => {
        const tile1firstIndex = getIndexOfFirstLayerInTileGroup( activeDocument, 0 );
        const tile2firstIndex = getIndexOfFirstLayerInTileGroup( activeDocument, 1 );
        const tile3firstIndex = getIndexOfFirstLayerInTileGroup( activeDocument, 2 );

        expect( tile1firstIndex ).toEqual( 0 );
        expect( tile2firstIndex ).toEqual( 2 );
        expect( tile3firstIndex ).toEqual( 5 );
    });

    it( "should be able to get the indices of the last Layer within a tile group, relative to the Document layer list", () => {
        const tile1lastIndex = getIndexOfLastLayerInTileGroup( activeDocument, 0 );
        const tile2lastIndex = getIndexOfLastLayerInTileGroup( activeDocument, 1 );
        const tile3lastIndex = getIndexOfLastLayerInTileGroup( activeDocument, 2 );

        expect( tile1lastIndex ).toEqual( 1 );
        expect( tile2lastIndex ).toEqual( 4 );
        expect( tile3lastIndex ).toEqual( 5 );
    });

    it( "should be able to retrieve the tile group id for a specific Layer by the Layers id", () => {
        expect(
            getTileByLayer( activeDocument, tile2Layer2.id )
        ).toEqual( 1 );
    });

    it( "should be able to get the previous tile by Layer order", () => {
        const shuffledDocument = DocumentFactory.create({
            layers: [
                tile1Layer1, tile1Layer2, // tile 0
                tile3Layer1, // tile 2
                tile2Layer1, tile2Layer2, tile2Layer3, // tile 1
            ]
        });
        expect( getPreviousTile( shuffledDocument, 2 )).toEqual( 0 );
    });

    it( "should be able to get the next tile by Layer order", () => {
        const shuffledDocument = DocumentFactory.create({
            layers: [
                tile1Layer1, tile1Layer2, // tile 0
                tile3Layer1, // tile 2
                tile2Layer1, tile2Layer2, tile2Layer3, // tile 1
            ]
        });
        expect( getNextTile( shuffledDocument, 0 )).toEqual( 2 );
    });
});