/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
let UID_COUNTER = 0;

export default {
    /**
     * Creates a graphic to be displayed within a layer of a Document
     *
     * @param {HTMLImageElement} bitmap
     * @param {Number=} x position of the bitmap within the layer
     * @param {Number=} y position of the bitmap within the layer
     * @param {Number=} width of the bitmap, defaults to actual bitmap width
     * @param {Number=} height of the bitmap, defaults to actual bitmap width
     */
    create( bitmap, x = 0, y = 0, width = -1, height = -1 ) {
        if ( width === -1 || height === -1 ) {
            ({ width, height } = bitmap);
        }
        const transparent = true; // TODO: MIME check
        return {
            id: `graphic_${( ++UID_COUNTER )}`,
            bitmap, x, y, width, height, transparent
        };
    },
};
