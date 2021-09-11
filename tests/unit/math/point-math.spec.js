import {
    translatePoints, isPointInRange, isCoordinateInHorizontalRange, isCoordinateInVerticalRange
} from "@/math/point-math";

describe( "Point math", () => {
    it( "should be able to translate the coordinates within a list", () => {
        const list = [
            { x: 10, y: 10 }, { x: 15, y: 15 }
        ];
        expect( translatePoints( list, 5, -5 )).toEqual([
            { x: 15, y: 5 }, { x: 20, y: 10 }
        ]);
    });

    describe( "when determining whether coordinates are in range of others", () => {
        it( "should know when a horizontal coordinate is in range of another, respecting given margin", () => {
            let margin = 0;

            expect( isCoordinateInHorizontalRange( 10, 10, margin )).toBe( true ); // exact match

            // expected to be out of range as there is no margin supplied
            expect( isCoordinateInHorizontalRange( 5,  10, margin )).toBe( false );
            expect( isCoordinateInHorizontalRange( 15, 10, margin )).toBe( false );

            margin = 5;

            // expected to be within range of margin
            expect( isCoordinateInHorizontalRange( 5,  10, margin )).toBe( true );
            expect( isCoordinateInHorizontalRange( 15, 10, margin )).toBe( true );

            // expected to be out of range (off by 1)
            expect( isCoordinateInHorizontalRange( 4,  10, margin )).toBe( false );
            expect( isCoordinateInHorizontalRange( 16, 10, margin )).toBe( false );
        });

        it( "should know when a vertical coordinate is in range of another, respecting given margin", () => {
            let margin = 0;

            expect( isCoordinateInVerticalRange( 10, 10, margin )).toBe( true ); // exact match

            // expected to be out of range as there is no margin supplied
            expect( isCoordinateInVerticalRange( 5,  10, margin )).toBe( false );
            expect( isCoordinateInVerticalRange( 15, 10, margin )).toBe( false );

            margin = 5;

            // expected to be within range of margin
            expect( isCoordinateInVerticalRange( 5,  10, margin )).toBe( true );
            expect( isCoordinateInVerticalRange( 15, 10, margin )).toBe( true );

            // expected to be out of range (off by 1)
            expect( isCoordinateInVerticalRange( 4,  10, margin )).toBe( false );
            expect( isCoordinateInVerticalRange( 16, 10, margin )).toBe( false );
        });

        it( "should know when a point if in range of another, respecting given margin", () => {
            let margin = 0;

            expect( isPointInRange( 10, 10, 10, 10, margin )).toBe( true ); // exact match

            // expected to be out of horizontal range as no margin is supplied
            expect( isPointInRange( 5,  10, 10, 10, margin )).toBe( false );
            expect( isPointInRange( 15, 10, 10, 10, margin )).toBe( false );

            // expected to be out of vertical range as no margin is supplied
            expect( isPointInRange( 10,  5, 10, 10, margin )).toBe( false );
            expect( isPointInRange( 10, 15, 10, 10, margin )).toBe( false );

            margin = 5;

            // expected to be within range of both horiontal and vertical margin
            expect( isPointInRange( 5,  5,  10, 10, margin )).toBe( true );
            expect( isPointInRange( 15, 15, 10, 10, margin )).toBe( true );

            // expected to be out of horizontal range (off by 1 on x axis)
            expect( isPointInRange( 4,  10, 10, 10, margin )).toBe( false );
            // expected to be out of vertical range (off by 1 on y axis)
            expect( isPointInRange( 10, 4, 10, 10, margin )).toBe( false );

            // expected to be out of range (off by 1 on both axes)
            expect( isPointInRange( 4,  4,  10, 10, margin )).toBe( false );
            expect( isPointInRange( 16, 16, 10, 10, margin )).toBe( false );
        });
    });
});
