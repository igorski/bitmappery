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

/**
 * Calculates the appropriate dimensions for fitting an image of dimensions
 * described by imageWidth x imageHeight in a destination area described by
 * destWidth x destHeight while maintaining the image aspect ratio.
 * This imply that the image can either be cropped or requires the destination
 * area to be scrollable in order to be displayed in full.
 */
export const scaleToRatio = ( imageWidth, imageHeight, destWidth, destHeight ) => {
    let ratio  = 1;
    let height = destHeight;

    if ( imageWidth > imageHeight ) {
        ratio  = imageHeight / imageWidth;
        height = destWidth * ratio;
    }
    else if ( imageHeight > imageWidth ) {
        ratio  = imageHeight / imageWidth;
        height = destWidth * ratio;
    }
    else if ( imageHeight === imageWidth ) {
        height = destWidth;
    }

    if ( height < destHeight ) {
        destWidth *= ( destHeight / height );
        height     = destHeight;
    }
    return {
        width: destWidth, height
    };
};

/**
 * convenience method to scale given value and its expected maxValue against
 * an arbitrary range (defined by maxCompareValue in relation to maxValue)
 */
export const scaleValue = ( value, maxValue, maxCompareValue ) => Math.min( maxValue, value ) * ( maxCompareValue / maxValue );

/**
 * In case given width x height exceeds the maximum amount of given megapixels, a new
 * width and height are returned that is within the range
 */
export const constrain = ( width, height, maxMegaPixel ) => {
    const megaPixel = width * height;
    if ( megaPixel > maxMegaPixel ) {
        const ratio = Math.sqrt( maxMegaPixel ) / Math.sqrt( megaPixel );
        width  = Math.round( width  * ratio );
        height = Math.round( height * ratio );
    }
    return { width, height };
};

export const isPortrait  = ( width, height ) => width < height;
export const isLandscape = ( width, height ) => width > height;
export const isSquare    = ( width, height ) => width === height;

export const isPointInRange = ( point1x, point1y, point2x, point2y, margin = 5 ) => {
    const left   = point2x - margin;
    const right  = point2x + margin;
    const top    = point2y - margin;
    const bottom = point2y + margin;

    return point1x >= left && point1x <= right && point1y >= top  && point1y <= bottom;
};

export const getRectangleForSelection = ( selection ) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;

    selection.forEach(({ x, y }) => {
        minX = Math.min( minX, x );
        maxX = Math.max( maxX, x );
        minY = Math.min( minY, y );
        maxY = Math.max( maxY, y );
    });
    return {
        left   : minX,
        top    : minY,
        width  : maxX - minX,
        height : maxY - minY
    };
};
