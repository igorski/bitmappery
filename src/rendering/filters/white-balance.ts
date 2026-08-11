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
export const applyWhiteBalance = ( input: Uint8ClampedArray, output: Uint8ClampedArray ): void => {
    const { length } = input;
    const totalPixels = length / 4;

    let totalR = 0, totalG = 0, totalB = 0;

    // calculate the sum of all RGB values
    for ( let i = 0; i < length; i += 4 ) {
        totalR += input[ i ];
        totalG += input[ i + 1 ];
        totalB += input[ i + 2 ];
    }

    // find the average value for each channel
    const avgR = totalR / totalPixels;
    const avgG = totalG / totalPixels;
    const avgB = totalB / totalPixels;

    // calculate the overall average brightness
    const avgGray = ( avgR + avgG + avgB ) / 3;

    // apply scaling factors per channel
    const scaleR = avgGray / avgR;
    const scaleG = avgGray / avgG;
    const scaleB = avgGray / avgB;

    for ( let i = 0; i < length; i += 4 ) {
        if ( input[ i + 3 ] === 0 ) {
            output[ i + 3 ] = 0;
            continue; // pixel is transparent
        }
        output[ i ]     = Math.min( 255, input[ i ] * scaleR );
        output[ i + 1 ] = Math.min( 255, input[ i + 1 ] * scaleG );
        output[ i + 2 ] = Math.min( 255, input[ i + 2 ] * scaleB );
    }
};
