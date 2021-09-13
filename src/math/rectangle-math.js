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
import { fastRound } from "@/math/unit-math";

const HALF = 0.5;

export const getRotationCenter = ({ left, top, width, height }, rounded = false ) => {
    const x = left + width  * HALF;
    const y = top  + height * HALF;
    return {
        x: rounded ? fastRound( x ) : x,
        y: rounded ? fastRound( y ) : y,
    };
};

export const rotateRectangle = ( rectangle, angleInRadians = 0, rounded = false ) => {
    if ( angleInRadians === 0 ) {
        return rectangle;
    }
    const { x, y, width, height } = rectangle;
    const x1 = -width  * HALF,
          x2 = width   * HALF,
          x3 = width   * HALF,
          x4 = -width  * HALF,
          y1 = height  * HALF,
          y2 = height  * HALF,
          y3 = -height * HALF,
          y4 = -height * HALF;

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
    out.x = x - ( out.width  / 2 - width  / 2 );
    out.y = y - ( out.height / 2 - height / 2 );

    if ( rounded ) {
        out.x      = fastRound( out.x );
        out.y      = fastRound( out.y );
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

export const scaleRectangle = ({ left, top, width, height }, scale = 1 ) => {
    const scaledWidth  = width  * scale;
    const scaledHeight = height * scale;
    return {
        left   : left - ( scaledWidth  * HALF - width  * HALF ),
        top    : top  - ( scaledHeight * HALF - height * HALF ),
        width  : scaledWidth,
        height : scaledHeight
    };
};

export const areEqual = ( rect1, rect2 ) => {
    return (
        rect1.left   === rect2.left  &&
        rect1.top    === rect2.top   &&
        // fallback for rectangles using x, y instead of left, top TODO: align these !!
        rect1.x      === rect2.x     &&
        rect1.y      === rect2.y     &&
        rect1.width  === rect2.width &&
        rect1.height === rect2.height
    );
};
