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
import type { Point } from "zcanvas";
import type { Brush, CloneToolOptions } from "@/definitions/editor";
import { createDrawable } from "@/factories/brush-factory";
import { createCanvas, getPixelRatio, setCanvasDimensions } from "@/utils/canvas-util";
import type LayerSprite from "@/rendering/canvas-elements/layer-sprite";
import { applyOverrideConfig, type OverrideConfig } from "@/rendering/utils/drawable-canvas-utils";
import { clone } from "@/utils/object-util";

const tempCanvas = createCanvas();

/**
 * Masks the contents of given source using given brushCvs, and renders the result onto given destContext.
 * Used by clone stamp tool.
 *
 * @param {CanvasRenderingContext2D} destContext context to render on
 * @param {Object} brush operation to use
 * @param {LayerSprite} sprite containg the relative (on-screen) Layer coordinates
 * @param {HTMLCanvasElement} source the source bitmap from which painting will be cloned
 * @param {Point[]} pointers Array of coordinates specifying the points within the clone source
 * @param {OverrideConfig} overrideConfig alternate pointers and coordinate scaling relative to Layer transformations
 * @param {number=} lastIndex index in the pointer list that was rendered, can be used to spread a single stroke over several iterations
 * @return {number} index of the last rendered pointer in the pointers list
 */
export const renderClonedStroke = (
    destContext: CanvasRenderingContext2D, brush: Brush, sprite: LayerSprite,
    source: HTMLCanvasElement, pointers: Point[], overrideConfig: OverrideConfig, lastIndex = 0
): number => {
    const { left, top } = sprite.layer;

    const { coords, opacity } = sprite.toolOptions as CloneToolOptions;
    const { radius, doubleRadius } = brush;

    const sourceX = ( coords.x - left ) - radius;
    const sourceY = ( coords.y - top )  - radius;

    const relSource = sprite.cloneStartCoords || sprite.getDragStartEventCoordinates();

    // prepare temporary canvas (match size with brush)
    const { cvs, ctx } = tempCanvas;
    setCanvasDimensions( tempCanvas, doubleRadius, doubleRadius );

    const dragStartOffset = sprite.getDragStartOffset();

    const overrides = clone( pointers );
    applyOverrideConfig( overrideConfig, overrides );

    ctx.globalAlpha = opacity;
    ctx.fillStyle   = createDrawable( brush, ctx, radius, radius );

    let i = lastIndex;
    for ( i; i < pointers.length; ++i ) {
        const sourcePoint = pointers[ i ];
        const destPoint   = overrides[ i ];

        const xDelta  = dragStartOffset.x + ( sourcePoint.x - relSource.x );
        const yDelta  = dragStartOffset.y + ( sourcePoint.y - relSource.y );

        // draw source bitmap data onto temporary canvas
        ctx.globalCompositeOperation = "source-over";

        ctx.clearRect( 0, 0, cvs.width, cvs.height );

        // source layers are rendered w/multiplication for devicePixelRatio
        const multiplier = getPixelRatio();

        ctx.drawImage(
            source,
            // source props
            ( sourceX + xDelta ) * multiplier,
            ( sourceY + yDelta ) * multiplier,
            doubleRadius * multiplier,
            doubleRadius * multiplier,
            // destination props
            0, 0, doubleRadius, doubleRadius
        );
    
        // draw the brush above the bitmap, keeping only the overlapping area
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillRect( 0, 0, doubleRadius, doubleRadius );

        // draw the masked result onto the destination canvas
        destContext.drawImage(
            cvs, 0, 0, doubleRadius, doubleRadius,
            destPoint.x - radius, destPoint.y - radius, doubleRadius, doubleRadius
        );
    }
    setCanvasDimensions( tempCanvas, 1, 1 ); // conserve memory allocated to Canvas instances

    return i; // is new last index
};
