import { getRectangleForSelection, isSelectionClosed } from "@/math/selection-math";

describe( "selection math", () => {
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
