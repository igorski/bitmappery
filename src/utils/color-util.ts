/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl, adapter from source of:
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
import type { RGB, HSV } from "@/definitions/colors";

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
