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
export const applyDuotone = ( data: Uint8ClampedArray, color1: string, color2: string ): void  => {
    const colorKey = `${color1}_${color2}`;
console.info('color key:'+colorKey + ' vs cacheKey:'+ cacheKey)
    if ( cacheKey !== colorKey ) {
        cacheGradient( color1, color2 );
        cacheKey = colorKey;
        console.info('set cached key to ' + colorKey, cacheKey === colorKey)
    }

    applyGrayScale( data );
    
    for ( let i = 0, l = data.length; i < l; i += 4 ) {
        if ( data[ i + 3 ] === 0 ) {
            continue; // pixel is transparent
        }
        data[ i ]     = cachedGradient[ data[ i ] * 4 ];
        data[ i + 1 ] = cachedGradient[ data[ i + 1 ] * 4 + 1 ];
        data[ i + 2 ] = cachedGradient[ data[ i + 2 ] * 4 + 2 ];
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

function applyGrayScale( data: Uint8ClampedArray ): void {
    let max = 0;
    let min = 255;

    // apply grayscale by averaging all RGB values in the image
    
    for ( let i = 0, l = data.length; i < l; i += 4 ) {
        if ( data[ i ] > max ) {
            max = data[ i ];
        }

        if ( data[ i ] < min ) {
            min = data[ i ];
        }

        const r = data[ i ];
        const g = data[ i + 1 ];
        const b = data[ i + 2 ];
        const v = 0.3333 * r + 0.3333 * g + 0.3333 * b;

        data[ i ] = data[ i + 1 ] = data[ i + 2 ] = v;
    }

    // normalize each pixel
    
    for ( let i = 0, l = data.length; i < l; i += 4 ) {
        const v = ( data[ i ] - min ) * 255 / ( max - min );
        data[ i ] = data[ i + 1 ] = data[ i + 2 ] = v;
    }
}
