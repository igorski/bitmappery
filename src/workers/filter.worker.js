/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
const MAX_8BIT = 255;
const HALF     = .5;

self.addEventListener( "message", async ({ data }) => {
    const { id, cmd } = data;
    let imageData;
    switch ( cmd ) {
        case "filters":
            imageData = renderFilters( data.imageData, data.width, data.height, data.filters );
            self.postMessage({ cmd: "complete", id, imageData });
            break;
    }
}, false );

/* internal methods */

const renderFilters = ( imageData, width, height, filters ) => {
    const contrast       = Math.pow((( filters.contrast * 100 ) + 100 ) / 100, 2 ); // -100 to 100 range
    const levels         = filters.levels * 2; // 0 to 2 range
    const { desaturate } = filters; // boolean

    const pixels = imageData.data;

    for ( let x = 0; x < width; ++x ) {
        for ( let y = 0; y < height; ++y ) {
            const i = ( y * width + x ) * 4;

            // 1. adjust level (note we leave the alpha channel unchanged)
            if ( levels ) {
                pixels[ i ]     = pixels[ i ]     * levels * levels; // R
                pixels[ i + 1 ] = pixels[ i + 1 ] * levels * levels; // G
                pixels[ i + 2 ] = pixels[ i + 2 ] * levels * levels; // B
            }
            // 2. desaturate (note we leave the alpha channel unchanged)
            if ( desaturate ) {
                const grayScale = pixels[ i ] * 0.3 + pixels[ i + 1 ] * 0.59 + pixels[ i + 2 ] * 0.11;
                pixels[ i ]     = grayScale; // R
                pixels[ i + 1 ] = grayScale; // G
                pixels[ i + 2 ] = grayScale; // B
            }
            // 3. adjust contrast (note we leave the alpha channel unchanged)
            if ( contrast ) {
                pixels[ i ]     = (( pixels[ i ]     / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT; // R
                pixels[ i + 1 ] = (( pixels[ i + 1 ] / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT; // G
                pixels[ i + 2 ] = (( pixels[ i + 2 ] / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT; // B
            }
        }
    }
    return imageData;
};
