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
import type { Point } from "zcanvas";
import type { Brush, CloneToolOptions } from "@/definitions/editor";
import { TOOL_SRC_MERGED } from "@/definitions/tool-types";
import { createDrawable } from "@/factories/brush-factory";
import { getCanvasInstance, getSpriteForLayer } from "@/factories/sprite-factory";
import { createCanvas, setCanvasDimensions } from "@/utils/canvas-util";
import { createSyncSnapshot } from "@/utils/document-util";
import type LayerSprite from "@/rendering/canvas-elements/layer-sprite";

const tempCanvas = createCanvas();

/**
 * Masks the contents of given source using given brushCvs, and renders the result onto given destContext.
 * Used by clone stamp tool.
 *
 * @param {CanvasRenderingContext2D} destContext context to render on
 * @param {Object} brush operation to use
 * @param {LayerSprite} sprite containg the relative (on-screen) Layer coordinates
 * @param {String|Number} sourceLayerId identifier of the Layer to use as source, can also be TOOL_SRC_MERGED
 * @param {Point[]=} optPointers optional Array of alternative coordinates
 */
export const renderClonedStroke = ( destContext: CanvasRenderingContext2D, brush: Brush,
    sprite: LayerSprite, sourceLayerId: string, optPointers?: Point[] ): void => {
    let left = 0;
    let top  = 0;
    let source;
    if ( sourceLayerId === TOOL_SRC_MERGED ) {
        source = createSyncSnapshot( getCanvasInstance().getActiveDocument() );
    } else {
        const sourceSprite = getSpriteForLayer({ id: sourceLayerId });
        if ( sourceSprite ) {
            ({ left, top } = sourceSprite.getBounds());
            source = sourceSprite.getBitmap();
        }
    }
    if ( !source ) {
        return;
    }
    const { coords, opacity } = sprite.toolOptions as CloneToolOptions;
    const { radius, doubleRadius } = brush;
    const pointers = optPointers || brush.pointers;

    const sourceX = ( coords.x - left ) - radius;
    const sourceY = ( coords.y - top ) - radius;

    const relSource = sprite.cloneStartCoords || sprite.getDragStartEventCoordinates();

    // prepare temporary canvas (match size with brush)
    const { cvs, ctx } = tempCanvas;
    setCanvasDimensions( tempCanvas, doubleRadius, doubleRadius );

    const dragStartOffset = sprite.getDragStartOffset();

    for ( let i = 0; i < pointers.length; ++i ) {
        const destinationPoint = pointers[ i ];

        const xDelta  = dragStartOffset.x + ( destinationPoint.x - relSource.x );
        const yDelta  = dragStartOffset.y + ( destinationPoint.y - relSource.y );

        // draw source bitmap data onto temporary canvas
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = opacity;

        ctx.clearRect( 0, 0, cvs.width, cvs.height );
        ctx.drawImage(
            source, sourceX + xDelta, sourceY + yDelta, doubleRadius, doubleRadius, 0, 0, doubleRadius, doubleRadius
        );

        // draw the brush above the bitmap, keeping only the overlapping area
        ctx.globalCompositeOperation = "destination-in";

        ctx.fillStyle = createDrawable( brush, ctx, radius, radius );
        ctx.fillRect( 0, 0, doubleRadius, doubleRadius );

        // draw the masked result onto the destination canvas
        destContext.drawImage(
            cvs, 0, 0, doubleRadius, doubleRadius,
            destinationPoint.x - radius, destinationPoint.y - radius, doubleRadius, doubleRadius
        );
    }
    setCanvasDimensions( tempCanvas, 1, 1 ); // conserve memory allocated to Canvas instances
};
