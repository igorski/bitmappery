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
import type { Point, Viewport } from "zcanvas";
import { getSizeForBrush } from "@/definitions/brush-types";
import { type Brush } from "@/definitions/editor";
import ToolTypes from "@/definitions/tool-types";
import type ZoomableCanvas from "@/rendering/actors/zoomable-canvas";
import { renderCross } from "@/rendering/cursors/cross";

const TWO_PI = 2 * Math.PI;

/**
 * Render an outline representing the currently active Brush as defined by the active toolType.
 * 
 * @param {CanvasRenderingContext2D} destinationContext to paint on
 * @param {ZoomableCanvas} canvas 
 * @param {Viewport} viewport 
 * @param {ToolTypes} toolType the currently active tool
 * @param {any} toolOptions options object for the tool
 * @param {Brush} brush the Brush instance used for the draw operation 
 * @param {Point} pointer coordinate of the current pointer position
 * @param {Point} brushOrigin the coordinate of the pointer when the brushing started (pointer press). When using the
 *        clone tool, this should be the chosen coordinate within the Document from were cloning should start.
 */
export const renderBrushOutline = (
    destinationContext: CanvasRenderingContext2D, canvas: ZoomableCanvas, viewport: Viewport,
    toolType: ToolTypes, toolOptions: any, brush: Brush, pointer: Point, brushOrigin: Point
): void => {
    const { zoomFactor } = canvas;
    const tx = pointer.x - viewport.left;
    const ty = pointer.y - viewport.top;

    destinationContext.lineWidth = 2 / zoomFactor;
    const drawOutline = toolType !== ToolTypes.CLONE || !!toolOptions.coords;

    if ( toolType === ToolTypes.CLONE ) {
        const { coords } = toolOptions;
        const cx = coords ? ( coords.x - viewport.left ) + ( pointer.x - brushOrigin.x ) : tx;
        const cy = coords ? ( coords.y - viewport.top  ) + ( pointer.y - brushOrigin.y ) : ty;
    
        // when no source coordinate is set, or when applying the clone stamp, we show a cross to mark the cloning origin
        const isDrawing = brush.down;
    
        if ( !coords || isDrawing ) {
            renderCross( destinationContext, cx, cy, brush.radius / zoomFactor );
        }
    }
    destinationContext.save(); // brush outline save()
    destinationContext.beginPath();

    if ( drawOutline ) {
        // any other brush mode state shows brush outline
        destinationContext.arc( tx, ty, getSizeForBrush( brush ), 0, TWO_PI );
        destinationContext.strokeStyle = "#999";
    }
    destinationContext.stroke();
    destinationContext.restore(); // brush outline restore()
};
