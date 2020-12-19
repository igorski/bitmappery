import { scaleToRatio, isPortrait, isLandscape, isSquare } from "@/utils/image-math";

describe( "Image math utilities", () => {
    describe( "When determining ratios", () => {
        const PORTRAIT  = { width: 3, height: 4 };
        const LANDSCAPE = { width: 4, height: 3 };
        const SQUARE    = { width: 3, height: 3 };

        it( "should correctly identify portrait images", () => {
            expect( isPortrait( PORTRAIT.width,  PORTRAIT.height )).toBe( true );
            expect( isPortrait( LANDSCAPE.width, LANDSCAPE.height )).toBe( false );
            expect( isPortrait( SQUARE.width,    SQUARE.height )).toBe( false );
        });

        it( "should correctly identify landscape images", () => {
            expect( isLandscape( PORTRAIT.width,  PORTRAIT.height )).toBe( false );
            expect( isLandscape( LANDSCAPE.width, LANDSCAPE.height )).toBe( true );
            expect( isLandscape( SQUARE.width,    SQUARE.height )).toBe( false );
        });

        it( "should correctly identify square images", () => {
            expect( isSquare( PORTRAIT.width,  PORTRAIT.height )).toBe( false );
            expect( isSquare( LANDSCAPE.width, LANDSCAPE.height )).toBe( false );
            expect( isSquare( SQUARE.width,    SQUARE.height )).toBe( true );
        });
    });
});
