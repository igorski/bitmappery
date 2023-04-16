import { it, describe, expect } from "vitest";
import { selectionToRectangle, scaleSelection, getLastShape } from "@/utils/selection-util";

describe( "Selection utilities", () => {
    const selection = [
        [
            { x: 10, y: 5 },
            { x: 50, y: 5 },
            { x: 50, y: 55 },
            { x: 10, y: 55 }
        ], [
            { x: 25, y: 25 },
            { x: 75, y: 25 },
            { x: 75, y: 75 },
            { x: 25, y: 75 },
        ]
    ];

    describe( "when calculating the bounding box rectangle for a selection", () => {
        it( "should be able to calculate the bounding box of a selection with a single Shape", () => {
            expect( selectionToRectangle( [ selection[ 1 ]] )).toEqual({
                left: 25,
                top: 25,
                width: 50,
                height: 50
            });
        });

        it( "should be able to calculate the bounding box of a selection with multiple Shapes", () => {
            expect( selectionToRectangle( selection )).toEqual({
                left: 10,
                top: 5,
                width: 65,
                height: 70
            });
        });
    });

    it( "should be able to scale the Shapes inside a selection", () => {
        expect( scaleSelection( selection, 1.5 )).toEqual([
            [
                { x: 15, y: 7.5 },
                { x: 75, y: 7.5 },
                { x: 75, y: 82.5 },
                { x: 15, y: 82.5 }
            ], [
                { x: 37.5,  y: 37.5 },
                { x: 112.5, y: 37.5 },
                { x: 112.5, y: 112.5 },
                { x: 37.5,  y: 112.5 }
            ]
        ]);
    });

    it( "should be able to retrieve the last shape in the selection", () => {
        expect( getLastShape( selection )).toEqual( selection.at( -1 ));
    });
});
