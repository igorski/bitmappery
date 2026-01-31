import { it, describe, expect } from "vitest";
import { hexToRGBA, RGBAtoHex } from "@/utils/color-util";

describe( "Shape utilities", () => {
   describe( "when converting hex to RGBA", () => { 
        it( "should convert hex a hex value without transparency to be fully opaque", () => {
            expect( hexToRGBA( "#FF0000" )).toEqual([ 255, 0, 0, 255 ]);
        });

        it( "should correctly convert a hexa value with transparency to RGBA", () => {
            expect( hexToRGBA( "#FF990077" )).toEqual([ 255, 153, 0, 119 ]);
        });
    });

    describe( "when converting RGBA to hex", () => {
        it( "should convert a fully opaque RGBA value to a six character hex value", () => {
            expect( RGBAtoHex([ 255, 0, 0, 255 ])).toEqual( "#FF0000" );
        });
    
        it( "should correctly convert a semi transparent RGBA value to hexa", () => {
            expect( RGBAtoHex([ 255, 153, 0, 119 ])).toEqual( "#FF990077" );
        });
    });
});