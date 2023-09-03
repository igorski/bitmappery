import { it, describe, expect } from "vitest";
import { constrain, isPortrait, isLandscape, isSquare } from "@/math/image-math";

describe( "Image math utilities", () => {
    describe( "When constrainting an image to the maximum supported size in megapixels", () => {
        it ( "should not adjust the dimensions of images below this threshold", () => {
            expect( constrain( 7999, 7999, 8000 * 8000 )).toEqual({ width: 7999, height: 7999 });
        });

        it ( "should not adjust the dimensions of images where one side is above the thresholds square root, but the product isn't above the max megapixel", () => {
            expect( constrain( 6000, 9000, 8000 * 8000 )).toEqual({ width: 6000, height: 9000 });
        });

        it ( "should adjust the dimensions of images above this threshold", () => {
            expect( constrain( 8001, 8001, 8000 * 8000 )).toEqual({ width: 8000, height: 8000 });
        });

        it ( "should adjust the dimensions of images above this threshold when they are in portrait ratio", () => {
            expect( constrain( 7500, 9000, 8000 * 8000 )).toEqual({ width: 7303, height: 8764 });
        });

        it ( "should adjust the dimensions of images above this threshold when they are in landscape ratio", () => {
            expect( constrain( 9000, 7500, 8000 * 8000 )).toEqual({ width: 8764, height: 7303 });
        });
    });

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
