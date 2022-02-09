/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
import { MIN_ZOOM, MAX_ZOOM } from "@/definitions/tool-types";
import { getZoomRange } from "@/math/image-math";

/**
 * Calculates the zoom level for given canvasDimensions to display the given
 * document in its entierity
 */
export const fitInWindow = ( activeDocument, canvasDimensions ) => {
    const { visibleWidth, visibleHeight, horizontalDominant } = canvasDimensions;
    const {
        zeroZoomWidth, zeroZoomHeight,
        minZoomWidth, minZoomHeight, pixelsPerZoomOutUnit,
    } = getZoomRange( activeDocument, canvasDimensions );

    if ( horizontalDominant ) {
        return clampLevel(( zeroZoomHeight - visibleHeight ) / pixelsPerZoomOutUnit );
    } else {
        return clampLevel(( zeroZoomWidth - visibleWidth ) / pixelsPerZoomOutUnit );
    }
};

/**
 * Calculates the zoom level for given canvasDimensions to display the given
 * document at its original size
 */
export const displayOriginalSize = ( activeDocument, canvasDimensions ) => {
    const { width, height } = activeDocument;
    const { horizontalDominant } = canvasDimensions;
    const {
        zeroZoomWidth, zeroZoomHeight, pixelsPerZoomOutUnit, pixelsPerZoomInUnit
    } = getZoomRange( activeDocument, canvasDimensions );

    let level;
    if ( width === zeroZoomWidth ) {
        level = 0; // equals precalculated best fit
    } else if ( width < zeroZoomWidth ) {
        if ( horizontalDominant ) {
            level = ( zeroZoomHeight - height ) / pixelsPerZoomOutUnit;
        } else {
            level = ( zeroZoomWidth - width ) / pixelsPerZoomOutUnit;
        }
    } else {
        if ( horizontalDominant ) {
            level = ( width - zeroZoomWidth ) / pixelsPerZoomInUnit;
        } else {
            level = ( height - zeroZoomHeight ) / pixelsPerZoomInUnit;
        }
    }
    return clampLevel( level );
};

/* internal methods */

const clampLevel = level => Math.max( MIN_ZOOM, Math.min( MAX_ZOOM, level ));
