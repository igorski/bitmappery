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
export const MAX_BLUR = 50;

export const applyBlur = ( pixels: Uint8ClampedArray, width: number, height: number, radius: number ): void =>
{
    const invertedRadius = (( MAX_BLUR - radius ) / MAX_BLUR ) * 100;
    
    const out = new Uint32Array( pixels.length );
    const tmpLines = new Float32Array( Math.max( width, height ) * 4 );

    const source = new Uint32Array( pixels.buffer );
    const coeffs = gaussCoef( width / invertedRadius );

    convolve( source, out, tmpLines, coeffs, width, height );
    convolve( out, source, tmpLines, coeffs, height, width );
};

/* internal methods */

/**
 * Calculate gaussian blur using IRR filter
 * https://software.intel.com/en-us/articles/iir-gaussian-blur-filter
 */
function gaussCoef( sigma: number ): Float32Array
{
    sigma = Math.max( sigma, 0.5 );
    
    const a = Math.exp( 0.726 * 0.726 ) / sigma;
    const g1 = Math.exp( -a );
    const g2 = Math.exp( -2 * a );
    const k = ( 1 - g1 ) * ( 1 - g1 ) / ( 1 + 2 * a * g1 - g2 );

    const a0 = k;
    const a1 = k * ( a - 1 ) * g1;
    const a2 = k * ( a + 1 ) * g1;
    const a3 = -k * g2;
    const b1 = 2 * g1;
    const b2 = -g2;
    const leftCorner  = ( a0 + a1 )  / ( 1 - b1 - b2 );
    const rightCorner = ( a2 + a3 ) / ( 1 - b1 - b2 );

    return new Float32Array([ a0, a1, a2, a3, b1, b2, leftCorner, rightCorner ]);
}

/**
 * Blurs and transposes src into dest
 */
function convolve(
    src: Uint32Array, dest: Uint32Array, lines: Float32Array, coeffs: Float32Array, width: number, height: number
): void {
    for ( let i = 0; i < height; i++ ) {
        // RGBA values for source and destination pixel
        let srcR: number, srcG: number, srcB: number, srcA: number;
        let destR: number, destG: number, destB: number, destA: number;

        let srcIndex = i * width;
        let outIndex = i;
        let lineIndex = 0;

        // 1. left to right
        let rgba = src[ srcIndex ];

        let prevSrcR = rgba & 0xff;
        let prevSrcG = ( rgba >> 8 ) & 0xff;
        let prevSrcB = ( rgba >> 16 ) & 0xff;
        let prevSrcA = ( rgba >> 24 ) & 0xff;

        let prevPrevDestR = prevSrcR * coeffs[ 6 ];
        let prevPrevDestG = prevSrcG * coeffs[ 6 ];
        let prevPrevDestB = prevSrcB * coeffs[ 6 ];
        let prevPrevDestA = prevSrcA * coeffs[ 6 ];

        let prevDestR = prevPrevDestR;
        let prevDestG = prevPrevDestG;
        let prevDestB = prevPrevDestB;
        let prevDestA = prevPrevDestA;

        let a0 = coeffs[ 0 ];
        let a1 = coeffs[ 1 ];
        let b1 = coeffs[ 4 ];
        let b2 = coeffs[ 5 ];

        for ( let j = 0; j < width; j++ ) {
            rgba = src[ srcIndex ];
            srcR = rgba & 0xff;
            srcG = ( rgba >> 8 ) & 0xff;
            srcB = ( rgba >> 16 ) & 0xff;
            srcA = ( rgba >> 24 ) & 0xff;

            destR = srcR * a0 + prevSrcR * a1 + prevDestR * b1 + prevPrevDestR * b2;
            destG = srcG * a0 + prevSrcG * a1 + prevDestG * b1 + prevPrevDestG * b2;
            destB = srcB * a0 + prevSrcB * a1 + prevDestB * b1 + prevPrevDestB * b2;
            destA = srcA * a0 + prevSrcA * a1 + prevDestA * b1 + prevPrevDestA * b2;

            prevPrevDestR = prevDestR;
            prevPrevDestG = prevDestG;
            prevPrevDestB = prevDestB;
            prevPrevDestA = prevDestA;

            prevDestR = destR;
            prevDestG = destG;
            prevDestB = destB;
            prevDestA = destA;

            prevSrcR = srcR;
            prevSrcG = srcG;
            prevSrcB = srcB;
            prevSrcA = srcA;

            lines[ lineIndex ] = prevDestR;
            lines[ lineIndex + 1 ] = prevDestG;
            lines[ lineIndex + 2 ] = prevDestB;
            lines[ lineIndex + 3 ] = prevDestA;

            lineIndex += 4;
            srcIndex++;
        }

        srcIndex--;
        lineIndex -= 4;
        outIndex += height * ( width - 1 );

        // 2. right to left
        rgba = src[ srcIndex ];

        prevSrcR = rgba & 0xff;
        prevSrcG = ( rgba >> 8 ) & 0xff;
        prevSrcB = ( rgba >> 16 ) & 0xff;
        prevSrcA = ( rgba >> 24 ) & 0xff;

        prevPrevDestR = prevSrcR * coeffs[ 7 ];
        prevPrevDestG = prevSrcG * coeffs[ 7 ];
        prevPrevDestB = prevSrcB * coeffs[ 7 ];
        prevPrevDestA = prevSrcA * coeffs[ 7 ];

        prevDestR = prevPrevDestR;
        prevDestG = prevPrevDestG;
        prevDestB = prevPrevDestB;
        prevDestA = prevPrevDestA;

        srcR = prevSrcR;
        srcG = prevSrcG;
        srcB = prevSrcB;
        srcA = prevSrcA;

        a0 = coeffs[ 2 ];
        a1 = coeffs[ 3 ];

        for ( let j = width - 1; j >= 0; j-- ) {
            destR = srcR * a0 + prevSrcR * a1 + prevDestR * b1 + prevPrevDestR * b2;
            destG = srcG * a0 + prevSrcG * a1 + prevDestG * b1 + prevPrevDestG * b2;
            destB = srcB * a0 + prevSrcB * a1 + prevDestB * b1 + prevPrevDestB * b2;
            destA = srcA * a0 + prevSrcA * a1 + prevDestA * b1 + prevPrevDestA * b2;

            prevPrevDestR = prevDestR;
            prevPrevDestG = prevDestG;
            prevPrevDestB = prevDestB;
            prevPrevDestA = prevDestA;

            prevDestR = destR;
            prevDestG = destG;
            prevDestB = destB;
            prevDestA = destA;

            prevSrcR = srcR;
            prevSrcG = srcG;
            prevSrcB = srcB;
            prevSrcA = srcA;

            rgba = src[ srcIndex ];
            srcR = rgba & 0xff;
            srcG = ( rgba >> 8 ) & 0xff;
            srcB = ( rgba >> 16 ) & 0xff;
            srcA = ( rgba >> 24 ) & 0xff;

            rgba =
                (( lines[ lineIndex ] + prevDestR ) << 0 ) +
                (( lines[ lineIndex + 1 ] + prevDestG) << 8 ) +
                (( lines[ lineIndex + 2 ] + prevDestB) << 16 ) +
                (( lines[ lineIndex + 3 ] + prevDestA) << 24 );

            dest[ outIndex ] = rgba;

            srcIndex--;
            lineIndex -= 4;
            outIndex -= height;
        }
    }
}
