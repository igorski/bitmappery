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
import { SNAP_MARGIN } from "@/definitions/tool-types";
import { isCoordinateInHorizontalRange, isCoordinateInVerticalRange } from "@/math/point-math";

// pool the Arrays that describe the currently dragging Sprites snappable areas
const horizontal = Array( 3 );
const vertical   = Array( 3 );

export const getSnappableAreas = sprite => {
    const bounds = sprite.getBounds();

    horizontal[ 0 ] = bounds.left;
    horizontal[ 1 ] = bounds.left + bounds.width / 2;
    horizontal[ 2 ] = bounds.left + bounds.width;

    vertical[ 0 ] = bounds.top;
    vertical[ 1 ] = bounds.top + bounds.height / 2;
    vertical[ 2 ] = bounds.top + bounds.height;

    return { horizontal, vertical };
}

export const snapSpriteToGuide = ( sprite, guide ) => {
    const { horizontal, vertical } = getSnappableAreas( sprite );
    const { left, top, width, height } = sprite.getBounds();

    for ( const cX of horizontal ) {
        for ( const cY of vertical ) {
            if ( isCoordinateInHorizontalRange( guide.x, cX, SNAP_MARGIN )) {
                let destX          = guide.x - ( width / 2 ); // by default snap sprite from center
                const quarterWidth = width / 4;
                const leftHalf     = left + quarterWidth;
                const rightHalf    = left + width - quarterWidth;

                if ( cX < leftHalf ) {
                    destX = guide.x;            // snap sprite left to given x
                } else if ( cX > rightHalf ) {
                    destX = guide.x - width;    // snap sprite right to given x
                }
                sprite.setBounds( destX, sprite.getY() );
            }

            if ( isCoordinateInVerticalRange( guide.y, cY, SNAP_MARGIN )) {
                let destY           = guide.y - ( height / 2 ); // by default snap sprite from center
                const quarterHeight = height / 4;
                const topHalf       = top + quarterHeight;
                const bottomHalf    = top + height - quarterHeight;

                if ( cY < topHalf ) {
                    destY = guide.y;            // snap sprite top to given y
                } else if ( cY > bottomHalf ) {
                    destY = guide.y - height;   // snap sprite bottom to given y
                }
                sprite.setBounds( sprite.getX(), destY );
            }
        }
    }
};
