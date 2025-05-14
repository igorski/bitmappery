/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
import { type Filters } from "@/definitions/document";
import FiltersFactory from "@/factories/filters-factory";

const MAX_8BIT     = 255;
const HALF_MAX8BIT = 2 / MAX_8BIT;
const ONE_THIRD    = 1 / 3;
const HALF         = 0.5;

const defaultFilters = FiltersFactory.create();

/**
 * Apply generic adjustment filters (brightness, contrast, gamma, vibrance, threshold)
 * onto provided RGBA pixel Array.
 */
export const applyAdjustments = ( pixels: Uint8ClampedArray, filters: Filters ): void =>
{
    const brightness     = filters.brightness * 2;//( filters.brightness * 2 ) - 1; // -1 to 1 range
    const contrast       = Math.pow((( filters.contrast * 100 ) + 100 ) / 100, 2 ); // -100 to 100 range
    const gamma          = filters.gamma * 2; // 0 to 2 range
    const vibrance       = -(( filters.vibrance * 200 ) - 100 ); // -100 to 100 range

    const { desaturate, invert, threshold } = filters;

    let r, g, b, a;
    let grayScale, max, avg, amt;
    const gammaSquared = gamma * gamma;

    const doBrightness = filters.brightness !== defaultFilters.brightness;
    const doContrast   = filters.contrast   !== defaultFilters.contrast;
    const doGamma      = filters.gamma      !== defaultFilters.gamma;
    const doVibrance   = filters.vibrance   !== defaultFilters.vibrance;
    const doThreshold  = filters.threshold  !== defaultFilters.threshold;
    const doInvert     = filters.invert     !== defaultFilters.invert;

    // loop through the pixels, note we increment the iterator by four
    // as each pixel is defined by four RGBA channel values : red, green, blue and the alpha channel

    for ( let i = 0, l = pixels.length; i < l; i += 4 ) {

        a = pixels[ i + 3 ];

        if ( a === 0 ) {
            continue; // pixel is transparent
        }

        r = pixels[ i ];
        g = pixels[ i + 1 ];
        b = pixels[ i + 2 ];
  
        // adjust gamma
        if ( doGamma ) {
            r = r * gammaSquared;
            g = g * gammaSquared;
            b = b * gammaSquared;
        }

        // invert
        if ( doInvert ) {
            r = MAX_8BIT - r;
            g = MAX_8BIT - g;
            b = MAX_8BIT - b;
        }

        // desaturate
        if ( desaturate ) {
            grayScale = r * 0.3 + g * 0.59 + b * 0.11;
            r = grayScale;
            g = grayScale;
            b = grayScale;
        }

        // adjust brightness
        if ( doBrightness ) {
            r *= brightness;
            g *= brightness;
            b *= brightness;
        }

        // adjust contrast
        if ( doContrast ) {
            r = (( r / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT;
            g = (( g / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT;
            b = (( b / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT;
        }

        // adjust vibrance
        if ( doVibrance ) {
            max = Math.max( r, g, b );
            avg = ( r + g + b ) * ONE_THIRD;
            amt = (( Math.abs( max - avg ) * HALF_MAX8BIT ) * vibrance ) * 0.1; // 0.01;

            if ( r !== max ) {
                r = r + ( max - r ) * amt;
            }
            if ( g !== max ) {
                g = g + ( max - g ) * amt;
            }
            if ( b !== max ) {
                b = b + ( max - b ) * amt;
            }
        }

        // adjust threshold

        if ( doThreshold && a > 0 ) {
            let luma = r * 0.3 + g * 0.59 + b * 0.11;

            luma = luma < threshold ? 0 : MAX_8BIT;

            r = g = b = luma;
        }

        // commit the changes
        pixels[ i ]     = r;
        pixels[ i + 1 ] = g;
        pixels[ i + 2 ] = b;
        //pixels[ i + 3 ] = a; // currently no filter uses alpha channel
    }
};