/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
import type { Selection, SelectionList } from "@/definitions/document";

export const getRectangleForSelection = ( selection: Selection ): Rectangle => {
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

export const getRectangleForSelectionList = ( list: SelectionList ): Rectangle => {
    let left = Infinity;
    let top  = Infinity;
    let width = 0;
    let height = 0;

    for ( const selection of list ) {
        const rect = getRectangleForSelection( selection );
        left = Math.min( left, rect.left );
        top = Math.min( top, rect.top );
        width = Math.max( width, rect.width );
        height = Math.max( height, rect.height );
    }
    return { left, top, width, height };
};

export const createSelectionForRectangle = ( width: number, height: number, x = 0, y = 0 ): Selection => [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
    { x, y }
];

export const isSelectionRectangular = ( selection: Selection ): boolean => {
    if ( selection.length !== 5 ) {
        return false;
    }
    if ( selection[ 1 ].x !== selection[ 2 ].x ||
         selection[ 2 ].y !== selection[ 3 ].y ) {
         return false;
    }
    return isSelectionClosed( selection );
};

export const isSelectionClosed = ( selection: Selection ): boolean => {
    // smallest selection is four point polygon
    if ( !selection || selection.length < 3 ) {
        return false;
    }
    const firstPoint = selection[ 0 ];
    const lastPoint  = selection[ selection.length - 1 ];

    return firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y;
};

export const getLastSelection = ( selectionList: SelectionList ): Selection => {
    return selectionList[ selectionList.length - 1 ];
};
