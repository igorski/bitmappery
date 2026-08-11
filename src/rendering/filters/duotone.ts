/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2025 - https://www.igorski.nl
 * Adapted from work by Matt Kandler (https://www.mattkandler.com/blog/duotone-image-filter-javascript-rails)
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
import { hexToRGBA } from "@/utils/color-util";

const cachedGradient: number[] = [];
let cacheKey: string = "";

/**
 * Applies a duo tone effect to provided Uint8ClampedArray list using provided color1 and color2.
 */
export const applyDuotone = ( input: Uint8ClampedArray, output: Uint8ClampedArray, color1: string, color2: string ): void => {
    const colorKey = `${color1}_${color2}`;

    if ( cacheKey !== colorKey ) {
        cacheGradient( color1, color2 );
        cacheKey = colorKey;
    }

    applyGrayScale( input, output );
    
    // note we read directly from the output buffer as it now contains the grayscale input

    for ( let i = 0, l = output.length; i < l; i += 4 ) {
        if ( output[ i + 3 ] === 0 ) {
            continue; // pixel is transparent
        }
        output[ i ]     = cachedGradient[ output[ i ] * 4 ];
        output[ i + 1 ] = cachedGradient[ output[ i + 1 ] * 4 + 1 ];
        output[ i + 2 ] = cachedGradient[ output[ i + 2 ] * 4 + 2 ];
    }
};

/* internal methods */

function cacheGradient( color1: string, color2: string ): void {
    const rgb1 = hexToRGBA( color1 );
    const rgb2 = hexToRGBA( color2 );

    cachedGradient.length = 0;

    for ( let i = 0, l = 256 * 4; i < l; i += 4 ) {
        cachedGradient[ i ]     = (( 256 - ( i / 4 )) * rgb1[ 0 ] + ( i / 4 ) * rgb2[ 0 ]) / 256;
        cachedGradient[ i + 1 ] = (( 256 - ( i / 4 )) * rgb1[ 1 ] + ( i / 4 ) * rgb2[ 1 ]) / 256;
        cachedGradient[ i + 2 ] = (( 256 - ( i / 4 )) * rgb1[ 2 ] + ( i / 4 ) * rgb2[ 2 ]) / 256;
        cachedGradient[ i + 3 ] = 255;
    }
}

function applyGrayScale( input: Uint8ClampedArray, output: Uint8ClampedArray ): void {
    const { length } = input;

    let max = 0;
    let min = 255;

    // apply grayscale by averaging all RGB values in the image
    
    for ( let i = 0; i < length; i += 4 ) {
        if ( input[ i ] > max ) {
            max = input[ i ];
        }

        if ( input[ i ] < min ) {
            min = input[ i ];
        }

        const r = input[ i ];
        const g = input[ i + 1 ];
        const b = input[ i + 2 ];
        const v = 0.3333 * r + 0.3333 * g + 0.3333 * b;

        output[ i ] = output[ i + 1 ] = output[ i + 2 ] = v;
    }

    // normalize each pixel
    
    for ( let i = 0; i < length; i += 4 ) {
        const v = ( output[ i ] - min ) * 255 / ( max - min );
        output[ i ] = output[ i + 1 ] = output[ i + 2 ] = v;
    }
}
