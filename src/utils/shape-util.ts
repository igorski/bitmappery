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

export const scaleShape = ( shape: Shape, scale: number ): Shape => {
    return shape.map(( point: Point ) => ({ x: point.x * scale, y: point.y * scale }));
};

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
export const canBeMerged = ( shapeA: Shape, shapeB: Shape ): boolean => {
    // Combine the coordinates of both polygons into a single array
    let combinedCoords = [ ...shapeA.flat(), ...shapeB.flat() ];

    // Sort the coordinates in counterclockwise order
    combinedCoords.sort(( a, b ) => {
        return ( a.x - combinedCoords[ 0 ].x ) * ( b.y - combinedCoords[ 0 ].y ) -
               ( b.x - combinedCoords[ 0 ].x ) * ( a.y - combinedCoords[ 0 ].y );
    });

    // Check if any coordinate is the same as the previous coordinate
    for ( let i = 1; i < combinedCoords.length; i++ ) {
        if ( combinedCoords[ i ].x === combinedCoords[ i - 1 ].x &&
             combinedCoords[ i ].y === combinedCoords[ i - 1 ].y ) {
            return true;
        }
    }
    return false;
};

export const mergeShapes = ( shapeA: Shape, shapeB: Shape ): Shape => {
    let combinedCoords = [ ...shapeA, ...shapeB ];

    // Sort the coordinates in counterclockwise order
    combinedCoords.sort(( a, b ) => {
        return ( a.x - combinedCoords[ 0 ].x ) * ( b.y - combinedCoords[ 0 ].y ) -
               ( b.x - combinedCoords[ 0 ].x ) * ( a.y - combinedCoords[ 0 ].y );
    });

    // Remove any duplicate points
    let uniqueCoords = combinedCoords.filter(( item, index ) => {
        return combinedCoords.findIndex(( coord ) => coord.x === item.x && coord.y === item.y ) === index;
    });

    // Create a new array of polygons that contains the merged polygon
    return uniqueCoords;
};
