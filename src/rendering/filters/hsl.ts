/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
import { RGBtoHSL, HSLtoRGB } from "@/utils/color-util";

/**
 * Applies HSL balancing onto provided data
 * 
 * @param pixels 
 * @param hue in -180 to 180 range
 * @param saturation in -1 to 1 range
 * @param lightness  in -1 to 1 range
 */
export const applyHSL = ( pixels: Uint8ClampedArray, hue: number, saturation: number, lightness: number ): void => {
    for ( let i = 0, len = pixels.length; i < len; i += 4 ) {
        let r = pixels[ i ];
        let g = pixels[ i + 1 ];
        let b = pixels[ i + 2 ];

        let { h, s, l } = RGBtoHSL({ r, g, b });

        h = ( h + hue + 360 ) % 360; // Keep hue wrapped inside 0-360°
        s = Math.max( 0, Math.min( 1, s + saturation ));
        // l = Math.max( 0, Math.min( 1, l + lightness )); // additive lightness

        // more natural lightness
        if ( lightness > 0 ) {
            l = l + ( 1.0 - l ) * lightness;
        } else if ( lightness < 0 ) {
            l = l + l * lightness; 
        }
        
        ({ r, g, b } = HSLtoRGB({ h, s, l }));

        pixels[ i ]     = r;
        pixels[ i + 1 ] = g;
        pixels[ i + 2 ] = b;
    }
};
