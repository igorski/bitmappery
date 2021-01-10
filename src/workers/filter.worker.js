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
import FiltersFactory from "@/factories/filters-factory";

const MAX_8BIT = 255;
const HALF     = .5;

const defaultFilters = FiltersFactory.create();

self.addEventListener( "message", async ({ data }) => {
    const { id, cmd } = data;
    let imageData;
    switch ( cmd ) {
        case "filters":
            imageData = renderFilters( data.imageData, data.filters );
            self.postMessage({ cmd: "complete", id, imageData });
            break;
    }
}, false );

/* internal methods */

const renderFilters = ( imageData, filters ) => {
    const brightness     = ( filters.brightness * 2 );//( filters.brightness * 2 ) - 1; // -1 to 1 range
    const contrast       = Math.pow((( filters.contrast * 100 ) + 100 ) / 100, 2 ); // -100 to 100 range
    const gamma          = ( filters.gamma * 2 ); // 0 to 2 range
    const vibrance       = -(( filters.vibrance * 200 ) - 100 ); // -100 to 100 range
    const { desaturate } = filters; // boolean

    const pixels = imageData.data;
    let r, g, b, a, max, avg, amt;

    const doBrightness = filters.brightness !== defaultFilters.brightness;
    const doContrast   = filters.contrast   !== defaultFilters.contrast;
    const doGamma      = filters.gamma      !== defaultFilters.gamma;
    const doVibrance   = filters.vibrance   !== defaultFilters.vibrance;

    // loop through the pixels, note we increment the iterator by four
    // as each pixel is defined by four channel values : red, green, blue and the alpha channel
    // note that for most filter types we leave the alpha channel unchanged

    for ( let i = 0, l = pixels.length; i < l; i += 4 ) {

        // 1. adjust gamma
        if ( doGamma ) {
            pixels[ i ]     = pixels[ i ]     * gamma * gamma; // R
            pixels[ i + 1 ] = pixels[ i + 1 ] * gamma * gamma; // G
            pixels[ i + 2 ] = pixels[ i + 2 ] * gamma * gamma; // B
        }
        // 2. desaturate
        if ( desaturate ) {
            const grayScale = pixels[ i ] * 0.3 + pixels[ i + 1 ] * 0.59 + pixels[ i + 2 ] * 0.11;
            pixels[ i ]     = grayScale; // R
            pixels[ i + 1 ] = grayScale; // G
            pixels[ i + 2 ] = grayScale; // B
        }
        // 3. adjust brightness
        if ( doBrightness ) {
            pixels[ i ]     = pixels[ i ]     * brightness; // R
            pixels[ i + 1 ] = pixels[ i + 1 ] * brightness; // G
            pixels[ i + 2 ] = pixels[ i + 2 ] * brightness; // B
        }
        // 4. adjust contrast
        if ( doContrast ) {
            pixels[ i ]     = (( pixels[ i ]     / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT; // R
            pixels[ i + 1 ] = (( pixels[ i + 1 ] / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT; // G
            pixels[ i + 2 ] = (( pixels[ i + 2 ] / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT; // B
        }
        // 5. adjust vibrance
        if ( doVibrance ) {
            r = pixels[ i ];
            g = pixels[ i + 1 ];
            b = pixels[ i + 2 ];
            max = Math.max( r, g, b );
            avg = ( r + g + b ) / 3;
            amt = (( Math.abs( max - avg ) * 2 / MAX_8BIT ) * vibrance ) / 10; // 100;

			pixels[ i ]     = r !== max ? r + ( max - r ) * amt : r;
            pixels[ i + 1 ] = g !== max ? g + ( max - g ) * amt : g;
            pixels[ i + 2 ] = b !== max ? b + ( max - b ) * amt : b;
        }
    }
    return imageData;
};
