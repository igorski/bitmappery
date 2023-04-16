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
import type { Point, Rectangle } from "zcanvas";
import type { Shape, Selection } from "@/definitions/document";
import { shapeToRectangle, scaleShape } from "@/utils/shape-util";

export const selectionToRectangle = ( selection: Selection ): Rectangle => {
    if ( selection.length === 1 ) {
        return shapeToRectangle( selection[ 0 ]);
    }

    const [ xCoords, yCoords ] = selection.reduce(( acc: number[][], shape: Shape ) => {
        acc[ 0 ].push( ...shape.map( s => s.x ));
        acc[ 1 ].push( ...shape.map( s => s.y ));
        return acc;
    }, [[], []] );

    const left = Math.min.apply( null, xCoords );
    const top  = Math.min.apply( null, yCoords );

    return {
        left,
        top,
        width  : Math.max.apply( null, xCoords ) - left,
        height : Math.max.apply( null, yCoords ) - top,
    };
};

export const scaleSelection = ( selection: Selection, scale: number ): Selection => {
    return selection.map(( shape: Shape ) => scaleShape( shape, scale ));
};

export const getLastShape = ( selection: Selection ): Shape => {
    return selection[ selection.length - 1 ];
};
