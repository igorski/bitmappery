/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2026 - https://www.igorski.nl
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
import { denormalise } from "@/definitions/filter-ranges";
import { type Filters } from "@/model/types/filters";
import FiltersFactory from "@/model/factories/filters-factory";

const MAX_8BIT     = 255;
const HALF_MAX8BIT = 2 / MAX_8BIT;
const ONE_THIRD    = 1 / 3;
const HALF         = 0.5;

const defaultFilters = FiltersFactory.create();

/**
 * Apply generic adjustment filters (brightness, contrast, gamma, vibrance, threshold)
 * onto provided RGBA pixel Array.
 * 
 * These can be combined in a single function as these filters do not
 * require an initial pass (for instant to calculate averages, etc.)
 */
export const applyAdjustments = ( input: Uint8ClampedArray, output: Uint8ClampedArray, filters: Filters ): void =>
{
    const doBrightness = filters.brightness !== defaultFilters.brightness;
    const doContrast   = filters.contrast   !== defaultFilters.contrast;
    const doGamma      = filters.gamma      !== defaultFilters.gamma;
    const doExposure   = filters.exposure   !== defaultFilters.exposure;
    const doVibrance   = filters.vibrance   !== defaultFilters.vibrance;
    const doThreshold  = filters.threshold  !== defaultFilters.threshold;
    const doInvert     = filters.quick.invert;
    const doDesaturate = filters.quick.desaturate;

    const { threshold } = filters;

    const brightness     = denormalise( filters, "brightness" );
    const contrast       = denormalise( filters, "contrast" );
    const gamma          = denormalise( filters, "gamma" );
    const exposure       = denormalise( filters, "exposure" );
    const vibrance       = denormalise( filters, "vibrance" );

    let lutTable: Uint8Array;
    
    if ( doExposure ) {
        const expFactor = Math.pow( 2, exposure );

        lutTable = new Uint8Array( 256 );
        for ( let i = 0; i < 256; i++ ) {
            lutTable[ i ] = Math.min( MAX_8BIT, Math.max( 0, i * expFactor ));
        }
    }

    let r, g, b, a;
    let grayScale, max, avg, amt;
    const gammaSquared = gamma * gamma;

    // loop through the pixels, note we increment the iterator by four
    // as each pixel is defined by four RGBA channel values : red, green, blue and the alpha channel

    for ( let i = 0, l = input.length; i < l; i += 4 ) {

        a = input[ i + 3 ];

        output[ i + 3 ] = a; // force syncing the alpha of the (pooled) output with the input as a "reset"

        if ( a === 0 ) {
            continue; // pixel is transparent
        }

        r = input[ i ];
        g = input[ i + 1 ];
        b = input[ i + 2 ];
  
        // adjust exposure
        if ( doExposure ) {
            r = lutTable![ r ];
            g = lutTable![ g ];
            b = lutTable![ b ];
        }

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
        if ( doDesaturate ) {
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
        output[ i ]     = r;
        output[ i + 1 ] = g;
        output[ i + 2 ] = b;
    }
};