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

/**
 * RGB values are in 0 - 255 range
 */
export type RGB = {
    r: number;
    g: number;
    b: number;
};

/**
 * RGBA values are in 0 - 255 range
 */
export type RGBA = [
    number, // red
    number, // green
    number, // blue
    number, // alpha
];

/**
 * HSL values
 * h: 0 to 360 range
 * s: 0 to 1 range
 * l: 0 to 1 range
 */
export type HSL = {
    h: number;
    s: number;
    l: number;
};

export type HSV = {
    h: number;
    s: number;
    v: number;
};
