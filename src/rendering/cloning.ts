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
import { TOOL_SRC_MERGED } from "@/definitions/tool-types";
import { createDrawable } from "@/factories/brush-factory";
import { getCanvasInstance } from "@/factories/sprite-factory";
import { createCanvas, getPixelRatio, setCanvasDimensions } from "@/utils/canvas-util";
import { createSyncSnapshot } from "@/utils/document-util";
import type LayerSprite from "@/rendering/canvas-elements/layer-sprite";
import { applyOverrideConfig, type OverrideConfig } from "@/rendering/utils/drawable-canvas-utils";

const tempCanvas = createCanvas();

/**
 * Masks the contents of given source using given brushCvs, and renders the result onto given destContext.
 * Used by clone stamp tool.
 *
 * @param {CanvasRenderingContext2D} destContext context to render on
 * @param {Object} brush operation to use
 * @param {LayerSprite} sprite containg the relative (on-screen) Layer coordinates
 * @param {String|Number} sourceLayerId identifier of the Layer to use as source, can also be TOOL_SRC_MERGED
 * @param {Point[]} sourcePoints Array of coordinates specifying the source points in the clone source
 * @param {Point} destination todo
 * @param {number=} lastIndex index in the pointer list that was rendered, can be used to spread a single stroke over several iterations
 * @return {number} index of the last rendered pointer in the pointers list
 */
export const renderClonedStroke = ( destContext: CanvasRenderingContext2D, brush: Brush,
    sprite: LayerSprite, sourceLayerId: string, sourcePoints: Point[], overrideConfig: OverrideConfig, lastIndex = 0 ): number => {
    const left = 0;
    const top  = 0;
    let source: HTMLCanvasElement | undefined;

    const activeDocument = getCanvasInstance().getActiveDocument();

    if ( sourceLayerId === TOOL_SRC_MERGED ) {
        source = createSyncSnapshot( activeDocument );
    } else {
        source = createSyncSnapshot( activeDocument, [ activeDocument.layers.findIndex(({ id }) => id === sourceLayerId )]);
    }

    if ( source === undefined ) {
        return lastIndex;
    }
    const { coords, opacity } = sprite.toolOptions as CloneToolOptions;
    const { radius, doubleRadius } = brush;

    const sourceX = ( coords.x - left ) - radius;
    const sourceY = ( coords.y - top ) - radius;

    const relSource = sprite.cloneStartCoords || sprite.getDragStartEventCoordinates();

    // prepare temporary canvas (match size with brush)
    const { cvs, ctx } = tempCanvas;
    setCanvasDimensions( tempCanvas, doubleRadius, doubleRadius );

    const dragStartOffset = sprite.getDragStartOffset();

    let i = lastIndex;
    for ( i; i < sourcePoints.length; ++i ) {
        const sourcePoint = sourcePoints[ i ];

        const xDelta  = dragStartOffset.x + ( sourcePoint.x - relSource.x );
        const yDelta  = dragStartOffset.y + ( sourcePoint.y - relSource.y );

        // draw source bitmap data onto temporary canvas
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = opacity;

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

        ctx.fillStyle = createDrawable( brush, ctx, radius, radius );
        ctx.fillRect( 0, 0, doubleRadius, doubleRadius );

        // draw the masked result onto the destination canvas
        destContext.drawImage(
            cvs, 0, 0, doubleRadius, doubleRadius,
            ( sourcePoint.x ) - radius, ( sourcePoint.y  ) - radius, doubleRadius, doubleRadius
        );
    }
    setCanvasDimensions( tempCanvas, 1, 1 ); // conserve memory allocated to Canvas instances

    return i; // is new last index
};
