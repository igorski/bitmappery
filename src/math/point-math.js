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
const { pow, sqrt, atan2, round, cos, sin, PI } = Math;

export const distanceBetween = ( point1, point2 ) => {
    return sqrt( pow( point2.x - point1.x, 2 ) + pow( point2.y - point1.y, 2 ));
};

export const angleBetween = ( point1, point2 ) => {
    return atan2( point2.x - point1.x, point2.y - point1.y );
};

export const pointBetween = ( point1, point2 ) => ({
    x: point1.x + ( point2.x - point1.x ) * .5,
    y: point1.y + ( point2.y - point1.y ) * .5,
});

export const isPointInRange = ( point1x, point1y, point2x, point2y, margin = 5 ) => {
    return isCoordinateInHorizontalRange( point1x, point2x, margin ) &&
           isCoordinateInVerticalRange( point1y, point2y, margin );
};

export const isCoordinateInHorizontalRange = ( point1x, point2x, margin = 5 ) => {
    const left   = point2x - margin;
    const right  = point2x + margin;

    return point1x >= left && point1x <= right;
};

export const isCoordinateInVerticalRange = ( point1y, point2y, margin = 5 ) => {
    const top    = point2y - margin;
    const bottom = point2y + margin;

    return point1y >= top && point1y <= bottom;
};

export const translatePointerRotation = ( x, y, rotationCenterX, rotationCenterY, angleInRadians ) => {
    const x2 = x - rotationCenterX;
    const y2 = y - rotationCenterY;

    const cos = Math.cos( angleInRadians );
    const sin = Math.sin( angleInRadians );

    return {
        x : ( cos * x2 ) + ( sin * y2 ) + rotationCenterX,
        y : ( cos * y2 ) - ( sin * x2 ) + rotationCenterY
    };
};

export const translatePoints = ( coordinateList, xTranslation = 0, yTranslation = 0 ) => {
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
 * @param {{ x: Number, y: Number }} sourcePoint coordinate to snap from
 * @param {{ left: Number, top: Number }} viewport in case coordinates are panned
 * @param {Number=} steps defaults to 4 (45 degree increments)
 */
export const snapToAngle = ( x, y, sourcePoint, { left = 0, top = 0 } = {}, steps = 4 ) => {
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
