/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
export const degreesToRadians = deg => deg * Math.PI / 180;
export const radiansToDegrees = rad => rad * 180 / Math.PI;

// Safari greatly benefits from round numbers as subpixel content is sometimes ommitted from rendering...
export const fastRound = num => num > 0 ? ( num + .5 ) << 0 : num | 0;

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
        width  = fastRound( width  * ratio );
        height = fastRound( height * ratio );
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

export const translatePointerRotation = ( x, y, rotationCenterX, rotationCenterY, angleInRadians ) => {
    const x2 = x - rotationCenterX;
    const y2 = y - rotationCenterY;

    const cos = Math.cos( -angleInRadians );
    const sin = Math.sin( -angleInRadians );

    return {
        x : x2 * cos - y2 * sin + rotationCenterX,
        y : x2 * sin + y2 * cos + rotationCenterY
    };
};

export const getRotationCenter = ({ left, top, width, height }, rounded = false ) => {
    const x = left + width  * .5;
    const y = top  + height * .5;
    return {
        x: rounded ? fastRound( x ) : x,
        y: rounded ? fastRound( y ) : y,
    };
};

export const getRotatedSize = ({ width, height }, angleInRadians, rounded = false ) => {
    const x1 = -width  * .5,
          x2 = width   * .5,
          x3 = width   * .5,
          x4 = -width  * .5,
          y1 = height  * .5,
          y2 = height  * .5,
          y3 = -height * .5,
          y4 = -height * .5;

    const cos = Math.cos( angleInRadians );
    const sin = Math.sin( angleInRadians );

    const x11 = x1  * cos + y1 * sin,
          y11 = -x1 * sin + y1 * cos,
          x21 = x2  * cos + y2 * sin,
          y21 = -x2 * sin + y2 * cos,
          x31 = x3  * cos + y3 * sin,
          y31 = -x3 * sin + y3 * cos,
          x41 = x4  * cos + y4 * sin,
          y41 = -x4 * sin + y4 * cos;

    const xMin = Math.min( x11, x21, x31, x41 ),
          xMax = Math.max( x11, x21, x31, x41 ),
          yMin = Math.min( y11, y21, y31, y41 ),
          yMax = Math.max( y11, y21, y31, y41 );

    const out = {
        width  : xMax - xMin,
        height : yMax - yMin
    };
    if ( rounded ) {
        out.width  = fastRound( out.width );
        out.height = fastRound( out.height );
    }
    return out;
};

export const rectangleToCoordinates = ( x, y, width, height ) => [
    { x, y }, { x: x + width, y },                          // TL to TR
    { x: x + width, y: y + height }, { x, y: y + height },  // BR to BL
    { x, y }, // back to TL to close selection
];

export const translatePoints = ( coordinateList, xTranslation = 0, yTranslation = 0 ) => {
    return coordinateList.map(({ x, y }) => ({
        x: x + xTranslation,
        y: y + yTranslation,
    }));
};

export const rotatePoints = ( coordinateList, rotationCenterX, rotationCenterY, angleInRadians ) => {
    return coordinateList.map(({ x, y }) => {
        return translatePointerRotation( x, y, rotationCenterX, rotationCenterY, angleInRadians );
    });
};

export const scaleRectangle = ({ left, top, width, height }, scale = 1 ) => {
    const scaledWidth  = width  * scale;
    const scaledHeight = height * scale;
    return {
        left   : left - ( scaledWidth  * .5 - width  * .5 ),
        top    : top  - ( scaledHeight * .5 - height * .5 ),
        width  : scaledWidth,
        height : scaledHeight
    };
};
