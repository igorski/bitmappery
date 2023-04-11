/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
import type { Point, Rectangle } from "zcanvas";
import type { Shape } from "@/definitions/document";

export const shapeToRectangle = ( shape: Shape ): Rectangle => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;

    shape.forEach(({ x, y }) => {
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

export const rectangleToShape = ( width: number, height: number, x = 0, y = 0 ): Shape => [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
    { x, y }
];

export const isShapeRectangular = ( shape: Shape ): boolean => {
    if ( shape.length !== 5 ) {
        return false;
    }
    if ( shape[ 1 ].x !== shape[ 2 ].x ||
         shape[ 2 ].y !== shape[ 3 ].y ) {
         return false;
    }
    return isShapeClosed( shape );
};

export const isShapeClosed = ( shape: Shape ): boolean => {
    // smallest shape is four point polygon
    if ( !shape || shape.length < 3 ) {
        return false;
    }
    const firstPoint = shape[ 0 ];
    const lastPoint  = shape[ shape.length - 1 ];

    return firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y;
};

/**
 * Verifies whether given shapes overlap and thus can be merged.
 * Note: this assumes each shape is not self-intersecting and has no holes.
 */
export const hasOverlap = ( shapeA: Shape, shapeB: Shape ): boolean => {
    const intersectionPoints = [];
    for ( let i = 0; i < shapeA.length; i++ ) {
        const p1 = shapeA[ i ];
        const p2 = shapeA[( i + 1 ) % shapeA.length ];
        for ( let j = 0; j < shapeB.length; j++ ) {
            const p3 = shapeB[ j ];
            const p4 = shapeB[( j + 1 ) % shapeB.length ];
            const intersection = getLineIntersectionA( p1, p2, p3, p4 );
            if ( intersection ) {
                intersectionPoints.push( intersection );
            }
        }
    }
    return intersectionPoints.length > 0;
};

function getLineIntersectionA( a1: Point, a2: Point, b1: Point, b2: Point ): Point | null {
    const d = ( a1.x - a2.x ) * ( b2.y - b1.y ) - ( a1.y - a2.y ) * ( b2.x - b1.x );
    if ( d === 0 ) {
        return null;
    }
    const ua = (( a1.y - a2.y ) * ( b1.x - a1.x ) - ( a1.x - a2.x ) * ( b1.y - a1.y )) / d;
    const ub = (( b1.y - b2.y ) * ( b1.x - a1.x ) - ( b1.x - b2.x ) * ( b1.y - a1.y )) / d;

    if ( ua < 0 || ua > 1 || ub < 0 || ub > 1 ) {
        return null;
    }
    return {
        x: a1.x + ua * ( a2.x - a1.x ),
        y: a1.y + ua * ( a2.y - a1.y )
    };
}


// er?

export function mergeShapes( shapeA: Shape, shapeB: Shape ): Shape {
    const points: Shape = [ ...shapeA, ...shapeB ];
    const sortedPoints = isClockwise( points ) ? points : points.reverse();

    const intersectPoints: Point[] = [];

    for ( let i = 0; i < sortedPoints.length; i++ ) {
        const current = sortedPoints[ i ];
        const next = sortedPoints[( i + 1 ) % sortedPoints.length ];

        for ( let j = i + 1; j < sortedPoints.length; j++ ) {
            const check = sortedPoints[ j ];
            const afterCheck = sortedPoints[( j + 1 ) % sortedPoints.length ];
            if ( doLineSegmentsIntersect( current, next, check, afterCheck )) {
                intersectPoints.push( getIntersectionPoint( current, next, check, afterCheck ));
            }
        }
    }

    const uniquePoints = [ ...new Set([ ...points, ...intersectPoints ].map( p => `${p.x},${p.y}` ))]
        .map( str => {
            const [ x, y ] = str.split( "," ).map( Number );
            return { x, y };
        });

    const mergedPoints = uniquePoints.sort( comparePoints );
    return mergedPoints;/*
    const hull = getConvexHull( mergedPoints );

    return mergedPoints.reduce(( acc, point ) => {
        if ( hull.find( p => p.x === point.x && p.y === point.y )) {
            acc.push( point );
        }
        return acc;
    }, []);*/
}

function comparePoints( a: Point, b: Point ): number {
    if ( a.x === b.x ) {
        return a.y - b.y;
    }
    return a.x - b.x;
}

function isClockwise( shape: Shape ): boolean {
    let sum = 0;
    for ( let i = 0; i < shape.length; i++ ) {
        const current = shape[ i ];
        const next = shape[( i + 1 ) % shape.length ];
        sum += ( next.x - current.x ) * ( next.y + current.y );
    }
    return sum > 0;
}

function doLineSegmentsIntersect( a: Point, b: Point, c: Point, d: Point ): boolean {
    const denominator = (( b.x - a.x ) * ( d.y - c.y )) - (( b.y - a.y ) * ( d.x - c.x ));
    if ( denominator === 0 ) {
        return false;
    }

    const numerator1 = (( a.y - c.y ) * ( d.x - c.x )) - (( a.x - c.x ) * ( d.y - c.y ));
    const numerator2 = (( a.y - c.y ) * ( b.x - a.x )) - (( a.x - c.x ) * ( b.y - a.y ));

    if ( numerator1 === 0 || numerator2 === 0 ) {
        return false;
    }

    const r = numerator1 / denominator;
    const s = numerator2 / denominator;

    return ( r > 0 && r < 1 ) && ( s > 0 && s < 1 );
}

function getIntersectionPoint( a: Point, b: Point, c: Point, d: Point ): Point {
    const denominator = (( b.x - a.x ) * ( d.y - c.y )) - (( b.y - a.y ) * ( d.x - c.x ));
    if ( denominator === 0 ) {
        return null;
    }

    const numerator1 = (( a.y - c.y ) * ( d.x - c.x )) - (( a.x - c.x ) * ( d.y - c.y ));
    const r = numerator1 / denominator;

    const x = a.x + ( r * ( b.x - a.x ));
    const y = a.y + ( r * ( b.y - a.y ));

    return { x, y };
}

export function getConvexHull( shape: Shape ): Shape {
    const hullShape: Shape = [ ...shape ];
    hullShape.sort( POINT_COMPARATOR );
    return makeHullPresorted( hullShape );
}

function POINT_COMPARATOR( a: Point, b: Point ): number {
    if ( a.x < b.x ) {
        return -1;
    } else if ( a.x > b.x ) {
        return 1;
    } else if ( a.y < b.y ) {
        return -1;
    } else if ( a.y > b.y ) {
        return +1;
    }
    return 0;
}

// Returns the convex hull, assuming that each points[i] <= points[i + 1]. Runs in O(n) time.
export function makeHullPresorted( points: Readonly<Shape> ): Shape {
    if ( points.length <= 1 ) {
        return points.slice();
    }

    // Andrew's monotone chain algorithm. Positive y coordinates correspond to "up"
    // as per the mathematical convention, instead of "down" as per the computer
    // graphics convention. This doesn't affect the correctness of the result.

    let upperHull: Shape = [];
    for ( let i = 0; i < points.length; i++ ) {
        const p: Point = points[ i ];
        while ( upperHull.length >= 2 ) {
            const q: Point = upperHull[ upperHull.length - 1 ];
            const r: Point = upperHull[ upperHull.length - 2 ];
            if (( q.x - r.x ) * ( p.y - r.y ) >= ( q.y - r.y ) * ( p.x - r.x )) {
                upperHull.pop();
            } else {
                break;
            }
        }
        upperHull.push( p );
    }
    upperHull.pop();

    let lowerHull: Shape = [];
    for ( let i = points.length - 1; i >= 0; i-- ) {
        const p: Point = points[ i ];
        while ( lowerHull.length >= 2 ) {
            const q: Point = lowerHull[ lowerHull.length - 1 ];
            const r: Point = lowerHull[ lowerHull.length - 2 ];
            if (( q.x - r.x ) * ( p.y - r.y ) >= ( q.y - r.y ) * ( p.x - r.x )) {
                lowerHull.pop();
            } else {
                break;
            }
        }
        lowerHull.push( p );
    }
    lowerHull.pop();

    if ( upperHull.length === 1 && lowerHull.length === 1 &&
         upperHull[ 0 ].x === lowerHull[ 0 ].x && upperHull[ 0 ].y === lowerHull[ 0 ].y ) {
         return upperHull;
    }
    return upperHull.concat( lowerHull );
}
