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
import type { Point, Rectangle } from "zcanvas";
import type ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";

const { pow, sqrt, atan2, round, cos, sin, PI } = Math;

export const rectToPoint = ({ top, left }: Rectangle ): Point => ({ x: left, y: top });

export const rectToCoordinateList = ( x: number, y: number, width: number, height: number ): Point[] => [
    { x, y }, { x: x + width, y },                          // TL to TR
    { x: x + width, y: y + height }, { x, y: y + height },  // BR to BL
    { x, y }, // back to TL to close selection
];

export const distanceBetween = ( point1: Point, point2: Point ): number => {
    return sqrt( pow( point2.x - point1.x, 2 ) + pow( point2.y - point1.y, 2 ));
};

export const angleBetween = ( point1: Point, point2: Point ): number => {
    return atan2( point2.x - point1.x, point2.y - point1.y );
};

export const pointBetween = ( point1: Point, point2: Point ): Point => ({
    x: point1.x + ( point2.x - point1.x ) * .5,
    y: point1.y + ( point2.y - point1.y ) * .5,
});

export const isPointInRange = ( point1x: number, point1y: number, point2x: number, point2y: number, margin = 5 ): boolean => {
    return isCoordinateInHorizontalRange( point1x, point2x, margin ) &&
           isCoordinateInVerticalRange( point1y, point2y, margin );
};

export const isCoordinateInHorizontalRange = ( point1x: number, point2x: number, margin = 5 ): boolean => {
    const left   = point2x - margin;
    const right  = point2x + margin;

    return point1x >= left && point1x <= right;
};

export const isCoordinateInVerticalRange = ( point1y: number, point2y: number, margin = 5 ): boolean => {
    const top    = point2y - margin;
    const bottom = point2y + margin;

    return point1y >= top && point1y <= bottom;
};

export const translatePointerRotation = ( x: number, y: number, rotationCenterX: number, rotationCenterY: number, angleInRadians: number ): Point => {
    const x2 = x - rotationCenterX;
    const y2 = y - rotationCenterY;

    const cos = Math.cos( angleInRadians );
    const sin = Math.sin( angleInRadians );

    return {
        x : ( cos * x2 ) + ( sin * y2 ) + rotationCenterX,
        y : ( cos * y2 ) - ( sin * x2 ) + rotationCenterY
    };
};

export const translatePoints = ( coordinateList: Point[], xTranslation = 0, yTranslation = 0 ): Point[] => {
    return coordinateList.map(({ x, y }) => ({
        x: x + xTranslation,
        y: y + yTranslation,
    }));
};

/**
 * Calculates the coordinate relative to given x, y and sourcePoint for an incremental snap
 *
 * @param {Number} x coordinate to snap to
 * @param {Number} y coordinate to snap to
 * @param {Point} sourcePoint coordinate to snap from
 * @param {{ left: Number, top: Number }} viewport in case coordinates are panned
 * @param {Number=} steps defaults to 4 (45 degree increments)
 */
export const snapToAngle = ( x: number, y: number, sourcePoint: Point, { left = 0, top = 0 } = {}, steps = 4 ): Point => {
    const deltaX = ( x - sourcePoint.x ) + left;
    const deltaY = ( y - sourcePoint.y ) + top;
    let dist = sqrt( pow( deltaX, 2 ) + pow( deltaY, 2 ));

    const newAngle     = atan2( deltaY, deltaX );
    const shiftedAngle = round( newAngle / PI * steps ) / steps * PI;

    dist *= cos( shiftedAngle - newAngle ); // closer to x, y

    return {
        x: sourcePoint.x - left + dist * cos( shiftedAngle ),
        y: sourcePoint.y - top  + dist * sin( shiftedAngle )
    };
};

/**
 * Converts a pointer position (e.g. from Mouse|TouchEvent) from anywhere in the DOM to
 * a coordinate relative to the canvas displaying the BitMappery document at the current
 * scale and viewport offset
 *
 * @param {Number} pointerX the x-coordinate of the pointer
 * @param {Number} pointerY the y-coordinate of the pointer
 * @param {ZoomableCanvas} zoomableCanvas
 * @param {DOMRect} canvasBoundingBox bounding box of the zoomableCanvas DOM Element
 */
export const pointerToCanvasCoordinates = ( pointerX: number, pointerY: number, zoomableCanvas: ZoomableCanvas, canvasBoundingBox: DOMRect ): Point => {
    const { zoomFactor } = zoomableCanvas;

    // ( pointer coordinate - bounding box coordinate ) is coordinate relative to canvas
    // by dividing this by the zoomFactor the value is scaled to the canvas' relative scale

    const offsetX = ( pointerX - canvasBoundingBox.left ) / zoomFactor;
    const offsetY = ( pointerY - canvasBoundingBox.top ) / zoomFactor;

    // subtract the canvas viewport position to get the coordinate relative to currently
    // visible area within the BitMappery document

    return {
        x : offsetX + zoomableCanvas.getViewport().left,
        y : offsetY + zoomableCanvas.getViewport().top
    };
};
