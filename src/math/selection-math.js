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
export const getRectangleForSelection = selection => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;

    selection.forEach(({ x, y }) => {
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

export const isSelectionClosed = selection => {
    // smallest selection is four point polygon
    if ( !selection || selection.length < 3 ) {
        return false;
    }
    const firstPoint = selection[ 0 ];
    const lastPoint  = selection[ selection.length - 1 ];

    return firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y;
};
