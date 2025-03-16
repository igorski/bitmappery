/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
import type { Rectangle } from "zcanvas";
import { SNAP_MARGIN } from "@/definitions/tool-types";
import {
    rectToPoint, distanceBetween, isCoordinateInHorizontalRange, isCoordinateInVerticalRange
} from "@/math/point-math";
import type LayerRenderer from "@/rendering/actors/layer-renderer";

type SnappableAreas = {
    horizontal: number[];
    vertical: number[];
};

// pool the Arrays that describe the currently dragging layer renderers snappable areas
// we only allow dragging one layer renderer at a time so this can be cached between
// guide rendering and drag release operations

const horizontal: number[] = new Array( 3 );
const vertical: number[] = new Array( 3 );
const snappableAreas: SnappableAreas = { horizontal, vertical };

function cacheSnappableAreas( renderer: LayerRenderer ): SnappableAreas {
    const bounds = renderer.getActualBounds(); // take Layer transformations into account

    horizontal[ 0 ] = bounds.left;
    horizontal[ 1 ] = bounds.left + bounds.width / 2;
    horizontal[ 2 ] = bounds.left + bounds.width;

    vertical[ 0 ] = bounds.top;
    vertical[ 1 ] = bounds.top + bounds.height / 2;
    vertical[ 2 ] = bounds.top + bounds.height;

    return snappableAreas;
}

/**
 * When there are a lot of guides, we filter out those that are too distant
 * from the currently dragging layer renderers location.
 *
 * This caches the snappable areas for given renderer
 *
 * @param {LayerRenderer} renderer to determine snapping points for
 * @param {Rectangle[]} guides all available snapping points
 */
export const getClosestSnappingPoints = ( renderer: LayerRenderer, guides: Rectangle[] ): Rectangle[] => {
    cacheSnappableAreas( renderer );

    const horizontals: Rectangle[] = [];
    const verticals: Rectangle[]   = [];

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

    const comparePoint = rectToPoint( renderer.getActualBounds() );

    const reducer = ( a: Rectangle, b: Rectangle ) => {
        return distanceBetween( comparePoint, rectToPoint( a )) < distanceBetween( comparePoint, rectToPoint( b )) ? a : b;
    }
    return [
        horizontals.length > 1 ? horizontals.reduce( reducer ) : horizontals[ 0 ],
        verticals.length > 1 ? verticals.reduce( reducer ) : verticals[ 0 ]
    ].filter( Boolean );
};

/**
 * Aligns the position of given renderer to the most appropriate of given guides.
 * This should be called on drag release.
 */
export const snapToGuide = ( renderer: LayerRenderer, guides: Rectangle[] ): void => {
    const filteredGuides = getClosestSnappingPoints( renderer, guides );
    const { left, top, width, height } = renderer.getBounds();

    let horSnap = false;
    let verSnap = false;

    for ( const guide of filteredGuides ) {
        for ( const cX of horizontal ) {
            for ( const cY of vertical ) {
                if ( !horSnap && isCoordinateInHorizontalRange( guide.left, cX, SNAP_MARGIN )) {
                    let destX          = guide.left - ( width / 2 ); // by default snap renderer from center
                    const quarterWidth = width / 4;
                    const leftHalf     = left + quarterWidth;
                    const rightHalf    = left + width - quarterWidth;

                    if ( cX < leftHalf ) {
                        destX = guide.left;         // snap renderer left to given left
                    } else if ( cX > rightHalf ) {
                        destX = guide.left - width; // snap renderer right to given left
                    }
                    renderer.setBounds( destX, renderer.getY() );
                    horSnap = true;
                }

                if ( !verSnap && isCoordinateInVerticalRange( guide.top, cY, SNAP_MARGIN )) {
                    let destY           = guide.top - ( height / 2 ); // by default snap renderer from center
                    const quarterHeight = height / 4;
                    const topHalf       = top + quarterHeight;
                    const bottomHalf    = top + height - quarterHeight;

                    if ( cY < topHalf ) {
                        destY = guide.top;          // snap renderer top to given top
                    } else if ( cY > bottomHalf ) {
                        destY = guide.top - height; // snap renderer bottom to given top
                    }
                    renderer.setBounds( renderer.getX(), destY );
                    verSnap = true;
                }
                if ( horSnap && verSnap ) {
                    return;
                }
            }
        }
    }
};
