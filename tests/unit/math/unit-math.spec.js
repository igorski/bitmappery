import { it, describe, expect } from "vitest";
import { fastRound } from "@/math/unit-math";

describe( "Unit math utilities", () => {
    describe( "When rounding numbers", () => {
        it( "should be able to round positive numbers", () => {
            expect( fastRound( 13.67689767 )).toEqual( 14 );
        });

        it( "should be able to round negative numbers", () => {
            expect( fastRound( -12.534523 )).toEqual( -12 );
        });
    });
});
