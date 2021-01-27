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
import { createDrawable } from "@/factories/brush-factory";
import { getCanvasInstance, getSpriteForLayer } from "@/factories/sprite-factory";
import { createCanvas, setCanvasDimensions } from "@/utils/canvas-util";
import { renderFullSize } from "@/utils/document-util";
import { TOOL_SRC_MERGED } from "@/definitions/tool-types";

const tempCanvas = createCanvas();

/**
 * Masks the contents of given source using given brushCvs, and renders the result onto given destContext.
 * Used by clone stamp tool.
 *
 * @param {CanvasRenderingContext2D} destContext context to render on
 * @param {Object} brush operation to use
 * @param {zCanvas.sprite} sprite containg the relative (on-screen) Layer coordinates
 * @param {String|Number} sourceLayerId identifier of the Layer to use as source, can also be TOOL_SRC_MERGED
 * @param {Array<{ x: Number, y: Number }>=} optPointers optional Array of alternative coordinates
 */
export const renderClonedStroke = ( destContext, brush, sprite, sourceLayerId, optPointers ) => {
    let left = 0;
    let top  = 0;
    let source;
    if ( sourceLayerId === TOOL_SRC_MERGED ) {
        source = renderFullSize( getCanvasInstance().getActiveDocument() );
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
    const { coords, opacity } = sprite._toolOptions;
    const { radius, doubleRadius, options } = brush;
    const { type } = options;
    const pointers = optPointers || brush.pointers;

    const sourceX = ( coords.x - left ) - radius;
    const sourceY = ( coords.y - top ) - radius;

    const relSource = sprite._cloneStartCoords || sprite._dragStartEventCoordinates;

    // prepare temporary canvas (match size with brush)
    const { cvs, ctx } = tempCanvas;
    setCanvasDimensions( tempCanvas, doubleRadius, doubleRadius );

    for ( let i = 0; i < pointers.length; ++i ) {
        const destinationPoint = pointers[ i ];

        const xDelta  = sprite._dragStartOffset.x + ( destinationPoint.x - relSource.x );
        const yDelta  = sprite._dragStartOffset.y + ( destinationPoint.y - relSource.y );

        // draw source bitmap data onto temporary canvas
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = opacity;

        ctx.clearRect( 0, 0, cvs.width, cvs.height );
        ctx.drawImage(
            source, sourceX + xDelta, sourceY + yDelta, radius, radius, 0, 0, radius, radius
        );

        // draw the brush above the bitmap, keeping only the overlapping area
        ctx.globalCompositeOperation = "destination-in";

        ctx.fillStyle = createDrawable( brush, ctx, 0, 0 );
        ctx.fillRect( 0, 0, radius, radius );//point.x - radius, point.y - radius, doubleRadius, doubleRadius );

        // draw the masked result onto the destination canvas
        destContext.drawImage(
            cvs, 0, 0, radius, radius,
            destinationPoint.x - radius, destinationPoint.y - radius, radius, radius
        );
    }
    setCanvasDimensions( tempCanvas, 1, 1 ); // conserve memory allocated to Canvas instances
};
