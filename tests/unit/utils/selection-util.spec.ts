import { it, describe, expect } from "vitest";
import { getRectangleForSelection, createSelectionForRectangle, isSelectionRectangular, isSelectionClosed } from "@/utils/selection-util";

describe( "selection util", () => {
    it( "should be able to calculate the bounding box of the selection", () => {
        const selection = [
            { x: 100, y: 150 },
            { x: 50,  y: 899 },
            { x: 50,  y: 100 },
            { x: 101, y: 100 }
        ];
        expect( getRectangleForSelection( selection )).toEqual({
            left: 50,
            top: 100,
            width: 51,
            height: 799
        });
    });

    it( "should be able to convert a rectangle into a valid list of selection coordinates", () => {
        expect( createSelectionForRectangle( 400, 300, 50, 75 )).toEqual([
            { x: 50,  y: 75 },
            { x: 450, y: 75 },
            { x: 450, y: 375 },
            { x: 50,  y: 375 },
            { x: 50,  y: 75 }
        ]);
    });

    describe(" when determining whether a selection is rectangular", () => {
        it( "should recognize unclosed selections", () => {
            expect(isSelectionRectangular([
                { x: 50,  y: 50 },
                { x: 250, y: 50 },
                { x: 250, y: 150 },
                { x: 50,  y: 150 }
            ])).toBe( false );
        });

        it( "should recognize non-rectangular selections", () => {
            expect(isSelectionRectangular([
                { x: 50,  y: 50 },
                { x: 250, y: 50 },
                { x: 150, y: 150 },
                { x: 50,  y: 150 },
                { x: 50,  y: 50 }
            ])).toBe( false );

            expect(isSelectionRectangular([
                { x: 50,  y: 50 },
                { x: 250, y: 50 },
                { x: 250, y: 150 },
                { x: 50,  y: 75 },
                { x: 50,  y: 50 }
            ])).toBe( false );
        });

        it( "should recognize a rectangular selection", () => {
            expect(isSelectionRectangular([
                { x: 50,  y: 50 },
                { x: 250, y: 50 },
                { x: 250, y: 150 },
                { x: 50,  y: 150 },
                { x: 50,  y: 50 }
            ])).toBe( true );
        });
    });

    describe( "when determining whether a selection is closed", () => {
        it( "should not consider a selection with less than four points closable", () => {
            const selection = [{ x: 100, y: 150 }];
            expect( isSelectionClosed( selection )).toBe( false );
            selection.push({ x: 150, y: 150 });
            expect( isSelectionClosed( selection )).toBe( false );
            selection.push({ x: 100, y: 200 });
            expect( isSelectionClosed( selection )).toBe( false );
        });

        it( "should not consider a selection where the first and last point are not at the same coordinate closed", () => {
            const selection = [
                { x: 100, y: 150 },
                { x: 150, y: 150 },
                { x: 100, y: 200 },
                { x: 100, y: 160 }
            ];
            expect( isSelectionClosed( selection )).toBe( false );
        });

        it( "should consider a selection where the first and last point are at the same coordinate closed", () => {
            const selection = [
                { x: 100, y: 150 },
                { x: 150, y: 150 },
                { x: 100, y: 200 },
                { x: 100, y: 150 }
            ];
            expect( isSelectionClosed( selection )).toBe( true );
        });
    });
});
