/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023-2026 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import type { RGB, RGBA, HSL, HSV } from "@/definitions/colors";

export const rgb2YCbCr = ( r: number, g: number, b: number ): RGB => ({
    r: 0.2990  * r + 0.5870 * g + 0.1140 * b,
    g: -0.1687 * r - 0.3313 * g + 0.5000 * b,
    b: 0.5000  * r - 0.4187 * g - 0.0813 * b
});

export const YCbCr2rgb = ( r: number, g: number, b: number ): RGB => ({
    r: r + 1.4020 * b,
    g: r - 0.3441 * g - 0.7141 * b,
    b: r + 1.7720 * g
});

export const rgb2hsv = ( r: number, g: number, b: number ): HSV => {
    const c = rgb2YCbCr( r, g, b );
    const s = Math.sqrt( c.g * c.g + c.b * c.b );
    const h = Math.atan2( c.g, c.b );
    return {
        h, s, v: c.r
    };
}

export const hsv2rgb = ( h: number, s: number, v: number ): RGB => {
    const g = s * Math.sin( h );
    const b = s * Math.cos( h );
    return YCbCr2rgb( v, g, b );
};

export const hexToRGBA = ( hex: string ): RGBA => {
    const str = hex.replace( "#", "" );
    return [
        hexToInt( str.substring( 0, 2 )),
        hexToInt( str.substring( 2, 4 )),
        hexToInt( str.substring( 4, 6 )),
        str.length > 6 ? hexToInt( str.substring( 6, 8 )) : 255,
    ];
};

export const RGBAtoHex = ( [ r, g, b, a ]: RGBA ): string => {
    const rgbHex = `#${intToHex(r)}${intToHex(g)}${intToHex(b)}`;

    return a === 255 ? rgbHex : `${rgbHex}${intToHex(a)}`;
};

// Converts RGB (0-255) to HSL (H: 0-360, S: 0-1, L: 0-1)
export const RGBtoHSL = ({ r, g, b }: RGB ): HSL => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max( r, g, b );
    const min = Math.min( r, g, b );

    let h, s, l = ( max + min ) / 2;

    if ( max === min ) {
        // achromatic
        h = 0;
        s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / ( 2 - max - min ) : d / ( max + min );
        switch ( max ) {
            default:
                h = 0;
                break;
            case r:
                h = ( g - b ) / d + ( g < b ? 6 : 0 );
                break;
            case g:
                h = ( b - r ) / d + 2;
                break;
            case b:
                h = ( r - g ) / d + 4;
                break;
        }
        h /= 6;
    }

    return {
        h: h * 360,
        s,
        l
    };
};

export const HSLtoRGB = ({ h, s, l }: HSL ): RGB => {
  h /= 360;
  let r, g, b;

    if ( s === 0 ) {
        // achromatic
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * ( 1 + s ) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRGB( p, q, h + 1 / 3 );
        g = hueToRGB( p, q, h );
        b = hueToRGB( p, q, h - 1 / 3 );
    }
    return {
        r: Math.round( r * 255 ),
        g: Math.round( g * 255 ),
        b: Math.round( b * 255 )
    };
};

/* internal methods */

function hexToInt( str: string ): number {
    return parseInt( str, 16 );
}

function intToHex( value: number ): string {
    return value.toString( 16 ).padStart( 2, "0" ).toUpperCase();
}

function hueToRGB( p: number, q: number, t: number ): number {
    if ( t < 0 ) t += 1;
    if ( t > 1 ) t -= 1;
    if ( t < 1/6 ) return p + ( q - p ) * 6 * t;
    if ( t < 1/2 ) return q;
    if ( t < 2/3 ) return p + ( q - p ) * ( 2 / 3 - t ) * 6;
    return p;
}