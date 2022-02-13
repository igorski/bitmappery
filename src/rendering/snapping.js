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
import {
    rectToPoint, distanceBetween, isCoordinateInHorizontalRange, isCoordinateInVerticalRange
} from "@/math/point-math";

// pool the Arrays that describe the currently dragging Sprites snappable areas
// we only allow dragging one Sprite at a time so this can be cached between
// guide rendering and drag release operations
const horizontal     = new Array( 3 );
const vertical       = new Array( 3 );
const snappableAreas = { horizontal, vertical };

function cacheSnappableAreas( sprite ) {
    const bounds = sprite.getBounds();

    horizontal[ 0 ] = bounds.left;
    horizontal[ 1 ] = bounds.left + bounds.width / 2;
    horizontal[ 2 ] = bounds.left + bounds.width;

    vertical[ 0 ] = bounds.top;
    vertical[ 1 ] = bounds.top + bounds.height / 2;
    vertical[ 2 ] = bounds.top + bounds.height;

    return snappableAreas;
};

/**
 * When there are a lot of guides, we filter out those that are too distant
 * from the currently dragging sprite's location.
 *
 * This caches the snappable areas for given Sprite
 *
 * @param {Sprite} sprite to determine snapping points for
 * @param {Array<Object>} guides all available snapping points
 */
export const getClosestSnappingPoints = ( sprite, guides ) => {
    cacheSnappableAreas( sprite );

    const horizontals = [];
    const verticals   = [];

    for ( const guide of guides ) {
        for ( const cX of horizontal ) {
            for ( const cY of vertical ) {
                if ( isCoordinateInHorizontalRange( guide.left, cX, SNAP_MARGIN )) {
                    horizontals.push( guide );
                } else if ( isCoordinateInVerticalRange( guide.top, cY, SNAP_MARGIN )) {
                    verticals.push( guide );
                }
            }
        }
    }
    // for each snappable area we must find the closest guide
    // one for the horizontal and one for the vertical axis

    const comparePoint = {
        x : sprite.getX(),
        y : sprite.getY()
    };

    const reducer = ( a, b ) => distanceBetween( comparePoint, rectToPoint( a )) < distanceBetween( comparePoint, rectToPoint( b )) ? a : b;
    return [
        horizontals.length > 1 ? horizontals.reduce( reducer ) : horizontals[ 0 ],
        verticals.length > 1 ? verticals.reduce( reducer ) : verticals[ 0 ]
    ].filter( Boolean );
};

/**
 * Aligns the position of given sprite to the most appropriate of given guides.
 * This should be called on drag release.
 */
export const snapSpriteToGuide = ( sprite, guides ) => {
    const filteredGuides = getClosestSnappingPoints( sprite, guides );
    const { left, top, width, height } = sprite.getBounds();

    let horSnap = false;
    let verSnap = false;

    for ( const guide of filteredGuides ) {
        for ( const cX of horizontal ) {
            for ( const cY of vertical ) {
                if ( !horSnap && isCoordinateInHorizontalRange( guide.left, cX, SNAP_MARGIN )) {
                    let destX          = guide.left - ( width / 2 ); // by default snap sprite from center
                    const quarterWidth = width / 4;
                    const leftHalf     = left + quarterWidth;
                    const rightHalf    = left + width - quarterWidth;

                    if ( cX < leftHalf ) {
                        destX = guide.left;          // snap sprite left to given left
                    } else if ( cX > rightHalf ) {
                        destX = guide.left - width;  // snap sprite right to given left
                    }
                    sprite.setBounds( destX, sprite.getY() );
                }

                if ( !verSnap && isCoordinateInVerticalRange( guide.top, cY, SNAP_MARGIN )) {
                    let destY           = guide.top - ( height / 2 ); // by default snap sprite from center
                    const quarterHeight = height / 4;
                    const topHalf       = top + quarterHeight;
                    const bottomHalf    = top + height - quarterHeight;

                    if ( cY < topHalf ) {
                        destY = guide.top;          // snap sprite top to given top
                    } else if ( cY > bottomHalf ) {
                        destY = guide.top - height; // snap sprite bottom to given top
                    }
                    sprite.setBounds( sprite.getX(), destY );
                }
                if ( horSnap && verSnap ) {
                    return;
                }
            }
        }
    }
};
