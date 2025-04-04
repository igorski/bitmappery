/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
import type { Point, Rectangle, Viewport } from "zcanvas";
import type { Layer, Selection, Shape } from "@/definitions/document";
import { rotateRectangleToCoordinates, scaleRectangle } from "@/math/rectangle-math";
import type { OverrideConfig } from "@/rendering/utils/drawable-canvas-utils";
import { isShapeRectangular } from "@/utils/shape-util";

/**
 * Prepares a clipping path corresponding to given selections outline, transformed
 * appropriately to the destination coordinates.
 *
 * @param {CanvasRenderingContext2D} ctx destination context to clip
 * @param {Selection} selection all shapes within the selection
 * @param {Number} offsetX destination offset to shift selection by (bounds relative to viewport)
 * @param {Number} offsetY destination offset to shift selection by (bounds relative to viewport)
 * @param {Boolean=} invert optional whether to invert the selection
 * @param {OverrideConfig=} overrideConfig optional override configuration when clipping a drawableCanvas while drawing.
 */
export const clipContextToSelection = ( ctx: CanvasRenderingContext2D, selection: Selection,
    offsetX: number, offsetY: number, invert = false, overrideConfig: OverrideConfig = null ): void => {
    let scale = 1;
    let vpX   = 0;
    let vpY   = 0;
    if ( overrideConfig ) {
        ({ scale, vpX, vpY } = overrideConfig );
    }

    // correct for scaling and viewport offset

    const deltaX = vpX / scale;
    const deltaY = vpY / scale;

    ctx.beginPath();
    for ( const shape of selection ) {
        shape.forEach(( point: Point, index: number ) => {
            ctx[ index === 0 ? "moveTo" : "lineTo" ]( ( point.x - offsetX ) - deltaX, ( point.y - offsetY ) - deltaY );
        });
        // when the selection is inverted, we can reverse the clipping operation
        // by drawing the rectangular outline over the clipping path
        if ( invert ) {
            createInverseClipping( ctx, shape, offsetX, offsetY, ctx.canvas.width, ctx.canvas.height );
            ctx.clip(); // necessary when using multiple shapes within selection
        }
    }
    ctx.closePath();
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

/**
 * Clip the output of a LayerRenderer to not exceed the Layers bounds (in case it is offset or transformed).
 * This is not necessary as zCanvas will automatically crop the bitmaps on render, however during live preview while
 * drawing on the Layer, we should clip the contents of the overlaid drawable Canvas to hide content that will
 * be clipped after committing the drawing.
 */
export const clipLayer = ( ctx: CanvasRenderingContext2D, layer: Layer, rendererBounds: Rectangle, viewport: Viewport, invert = false ): void => {
    const { scale, rotation, mirrorY } = layer.transform;

    const bounds = scaleRectangle( rendererBounds, scale );
    bounds.top  -= viewport.top;
    bounds.left -= viewport.left;
    
    const selection = [ rotateRectangleToCoordinates( bounds, mirrorY ? -rotation : rotation )];
    
    clipContextToSelection( ctx, selection, 0, 0, invert );
};
