import { it, describe, expect } from "vitest";
import { displayAsKb, displayAsMb, fixedFloat, formatFileName, truncate } from "@/utils/string-util";

describe( "String utilities", () => {
    describe( "When truncating a string", () => {
        it( "should leave the string unchanged when its length is below the request cutoff", () => {
            expect( truncate( "0123456789", 10 )).toEqual( "0123456789" );
        });

        it( "should cut off the string when the character input reaches the cutoff, and append ellipses", () => {
            expect( truncate( "0123456789", 5 )).toEqual( "01234..." );
        });
    });

    describe( "When displaying file size in a specific unit", () => {
        it( "should be able to display the value in kilobytes", () => {
            expect( displayAsKb( 1024000 )).toEqual( "1000 Kb" );
        });

        it( "should be able to display the value in megabytes", () => {
            expect( displayAsMb( 1024000 )).toEqual( "0.98 Mb" );
        });
    });

    describe( "When formatting file names", () => {
        it( "should replace whitespace with underscores", () => {
            expect( formatFileName( "foo bar baz" )).toEqual( "foo_bar_baz" ); 
        });
    });

    describe( "When rounding the value of a stringified float", () => {
        it( "should not round non-fractional values", () => {
            expect( fixedFloat( 1, 2 )).toEqual( "1" );
        });

        it( "should not round values with fractions smaller or equal than the requested digits amount", () => {
            expect( fixedFloat( 1.1, 2 )).toEqual( "1.1" );
            expect( fixedFloat( 1.12, 2 )).toEqual( "1.12" );
        });

        it( "should round values when the fractional part exceeds the length of the requested amount of digits", () => {
            expect( fixedFloat( 1.102233, 2 )).toEqual( "1.10" );
        });
    });
});