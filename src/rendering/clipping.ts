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
import type { Shape, Selection } from "@/definitions/document";
import type { OverrideConfig } from "@/rendering/lowres";
import { isShapeRectangular } from "@/utils/shape-util";

/**
 * Prepares a clipping path corresponding to given selections outline, transformed
 * appropriately to the destination coordinates.
 *
 * @param {CanvasRenderingContext2D} ctx destination context to clip
 * @param {Selection} selectionPoints all coordinates within the selection
 * @param {Number} offsetX destination offset to shift selection by (bounds relative to viewport)
 * @param {Number} offsetY destination offset to shift selection by (bounds relative to viewport)
 * @param {Boolean=} invert optional whether to invert the selection
 * @param {OverrideConfig=} overrideConfig optional override Object when workin in lowres preview mode
 */
export const clipContextToSelection = ( ctx: CanvasRenderingContext2D, selection: Selection,
    offsetX: number, offsetY: number, invert = false, overrideConfig: OverrideConfig = null ): void => {
    let scale = 1;
    let vpX   = 0;
    let vpY   = 0;
    if ( overrideConfig ) {
        ({ scale, vpX, vpY } = overrideConfig );
    }
    ctx.beginPath();
    for ( const selectionPoints of selection ) {
        selectionPoints.forEach(( point, index ) => {
            ctx[ index === 0 ? "moveTo" : "lineTo" ]( (( point.x - offsetX ) * scale ) - vpX, (( point.y - offsetY ) * scale ) - vpY );
        });
        // when the selection is inverted, we can reverse the clipping operation
        // by drawing the rectangular outline over the clipping path
        if ( invert ) {
            createInverseClipping( ctx, selectionPoints, offsetX, offsetY, ctx.canvas.width, ctx.canvas.height );
        }
    }
    ctx.clip();
};

export const createInverseClipping = ( ctx: CanvasRenderingContext2D, shape: Shape,
    x: number, y: number, width: number, height: number ): void => {
    // when the selection is inverted, we can reverse the clipping operation
    // by drawing the rectangular outline over the clipping path
    if ( isShapeRectangular( shape )) {
        ctx.rect( width - x, -y, -width, height );
    } else {
        ctx.rect( width - x, height - y, -width, -height );
    }
};
