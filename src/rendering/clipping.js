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
import { isSelectionRectangular } from "@/math/selection-math";

/**
 * Prepares a clipping path corresponding to given selections outline, transformed
 * appropriately to the destination coordinates. NOTE: don't forget to restore the ctx when done.
 *
 * @param {CanvasRenderingContext2D} ctx destination context to clip
 * @param {Array<{{ x: Number, y: Number }}>} selectionPoints all coordinates within the selection
 * @param {Boolean} useFloodFill whether selection will be filled using .fill() (requires different clipping preparation)
 * @param {Number} offsetX destination offset to shift selection by (bounds relative to viewport)
 * @param {Number} offsetY destination offset to shift selection by (bounds relative to viewport)
 * @param {Boolean=} invert optional whether to invert the selection
 * @param {Object=} overrideConfig optional override Object when workin in lowres preview mode
 */
export const clipContextToSelection = ( ctx, selectionPoints, useFloodFill, offsetX, offsetY, invert = false, overrideConfig = null ) => {
    let scale = 1;
    let vpX   = 0;
    let vpY   = 0;
    if ( overrideConfig ) {
        ({ scale, vpX, vpY } = overrideConfig );
    }
    ctx.save();
    ctx.beginPath();
    selectionPoints.forEach(( point, index ) => {
        ctx[ index === 0 ? "moveTo" : "lineTo" ]( (( point.x - offsetX ) * scale ) - vpX, (( point.y - offsetY ) * scale ) - vpY );
    });
    // when the selection is inverted, we can reverse the clipping operation
    // by drawing the rectangular outline over the clipping path
    if ( invert ) {
        createInverseClipping( ctx, selectionPoints, offsetX, offsetY, ctx.canvas.width, ctx.canvas.height );
    }
    if ( !useFloodFill ) {
        ctx.clip();
    }
};

export const createInverseClipping = ( ctx, selection, x, y, width, height ) => {
    // when the selection is inverted, we can reverse the clipping operation
    // by drawing the rectangular outline over the clipping path
     if ( isSelectionRectangular( selection )) {
         ctx.rect( width - x, -y, -width, height );
     } else {
         ctx.rect( width - x, height - y, -width, -height );
     }
 };
