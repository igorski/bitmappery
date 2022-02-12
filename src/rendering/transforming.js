/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2022 - https://www.igorski.nl
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
import { getRotationCenter } from "@/math/rectangle-math";

/**
 * Prepare given ctx to perform drawing operations for mirrored or
 * rotated content. Prior to invoking this function the context should be saved
 * and subsequently restored after drawing.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} viewport the ZoomableCanvas viewport
 * @param {LayerSprite} sprite
 * @param {Object} bounds
 * @param {Layer} layer that given sprite is renderering the contents of
 * @return {Object} updated bounds Object
 */
export const prepareTransformation = ( ctx, viewport, sprite, bounds, layer ) => {
    const { mirrorX, mirrorY, rotation } = layer.effects;

    const isMirrored = mirrorX || mirrorY;
    const isRotated  = sprite.isRotated();

    if ( !isMirrored && !isRotated ) {
        return bounds; // nothing to transform
    }

    const { width, height } = bounds;
    const transformedBounds = { ...bounds };

    // 1. offset the canvas to make up for the viewport pan position
    ctx.translate( -viewport.left, -viewport.top );

    // 2. apply mirror transformation
    if ( isMirrored ) {
        const scale = 1 / sprite.canvas.documentScale;
        ctx.setTransform(
            ( mirrorX ? -1 : 1 ) * scale,
            0,
            0,
            ( mirrorY ? -1 : 1 ) * scale,
            mirrorX ? ctx.canvas.width  : 0,
            mirrorY ? ctx.canvas.height : 0
        );
        // offset the canvas to make up for the layer position
        ctx.translate( bounds.left, bounds.top );
    }

    // 3. apply rotation
    let x = 0;
    let y = 0;
    if ( isRotated ) {
        const rotatedBounds = getRotationCenter({
            left : transformedBounds.left,
            top  : transformedBounds.top,
            width,
            height
        }, true );

        ({ x, y } = rotatedBounds );

        ctx.translate( x, y );
        ctx.rotate( mirrorX ? -rotation : rotation );
        ctx.translate( -x, -y );
    }

    // problem : activating these offsets the rotation center on a panned layer
    // activating it however makes sure the drag direction feels natural...
    // (in other words that bounds.left|top are performed correctly)

    if ( mirrorX ) {
    //    transformedBounds.left = -transformedBounds.left;
    }

    if ( mirrorY ) {
    //    transformedBounds.top = -transformedBounds.top;
    }
    return transformedBounds;
};
