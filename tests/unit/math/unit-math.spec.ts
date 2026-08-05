import { it, describe, expect } from "vitest";
import { fastRound, mapRange } from "@/math/unit-math";

describe( "Unit math utilities", () => {
    describe( "When rounding numbers", () => {
        it( "should be able to round positive numbers", () => {
            expect( fastRound( 13.67689767 )).toEqual( 14 );
        });

        it( "should be able to round negative numbers", () => {
            expect( fastRound( -12.534523 )).toEqual( -12 );
        });
    });

    describe( "When mapping value to an arbitrary range", () => {
        it( "should be able to map a normalised value to an arbitrary signed range", () => {
            expect( mapRange( 0, 0, 1, -1, 1 )).toEqual( -1 );
            expect( mapRange( 0.5, 0, 1, -1, 1 )).toEqual( 0 );
            expect( mapRange( 1, 0, 1, -1, 1 )).toEqual( 1 );
        });
    });
});
