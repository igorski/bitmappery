/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023-2026 - https://www.igorski.nl
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
import {
    diff,
    intersection,
    type Position as MartinezPoint,
    type Ring as MartinezShape,
    union
} from "martinez-polygon-clipping";
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


export const isOverlappingShape = ( shapeList: Shape[], shapeB: Shape ): boolean => {
    const polyA = shapeList.map( shape => shape.map( pointToMartinez ));
    const polyB = [ shapeB.map( pointToMartinez )];

    const polygonIntersection = intersection( polyA, polyB );

    return polygonIntersection !== null && polygonIntersection.length > 0;
};

export const mergeShapes = ( shapeList: Shape[], shapeToAdd: Shape ): Shape[] => {
    const polyA = shapeList.map( shape => shape.map( pointToMartinez ) as MartinezShape );
    const polyB = [ shapeToAdd.map( pointToMartinez ) as MartinezShape ];

    const polygonUnion = union( polyA, polyB );

    if ( !polygonUnion || polygonUnion.length === 0 ) {
        return [ ...shapeList, shapeToAdd ]; // no overlap, return all shapes as unique entries
    }
    return polygonUnion.flatMap( poly => poly.map( ring => ring.map( m => martinezToPoint( m as MartinezPoint ))));
};

export const subtractShapes = ( shapeList: Shape[], shapeToSubtract: Shape ): Shape[]  => {
    const polyA = shapeList.map( shape => shape.map( pointToMartinez ) as MartinezShape );
    const polyB = [ shapeToSubtract.map( pointToMartinez ) as MartinezShape ];

    const polygonDifference = diff( polyA, polyB );

    if ( !polygonDifference || polygonDifference.length === 0 ) {
        return []; // the entire shape was removed
    }
    
    // remove any possible holes from the subtracted polygons
    const cleanedDiff = polygonDifference.map( polygon => [ polygon[ 0 ]]);

    return cleanedDiff.flatMap( poly => poly.map( ring => ring.map( m => martinezToPoint( m as MartinezPoint ))));
};

/* internal methods */

function pointToMartinez( p: Point ): MartinezPoint {
    return [ p.x, p.y ];
}

function martinezToPoint( [ x, y ]: MartinezPoint ): Point {
    return { x, y };
}
