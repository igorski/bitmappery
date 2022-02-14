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
import { layerToRect } from "@/factories/layer-factory";
import { scaleRectangle, getRotationCenter } from "@/math/rectangle-math";

let bounds;

/**
 * Prepare given ctx to perform drawing operations for mirrored or
 * rotated content. Prior to invoking this function the context should be saved
 * and subsequently restored after drawing.
 *
 * This method returns a transforming bounding box which can optionally be used by
 * the renderer during its draw operation (when the renderer is a zCanvas sprite, this
 * would allow for easy re-use of the existing API)
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Layer} layer to be rendering the contents of
 * @param {Object=} viewport optional ZoomableCanvas viewport (when using within a sprite)
 * @return {Object|null} null when no transformation took place, updated bounds Object when
 *                       preparation took place.
 */
export const prepareTransformation = ( ctx, layer, viewport = { left: 0, top: 0 }) => {
    const { mirrorX, mirrorY, scale, rotation } = layer.effects;

    const isMirrored = mirrorX || mirrorY;
    const isScaled   = scale !== 1;
    const isRotated  = rotation % 360 !== 0;

    if ( !isMirrored && !isRotated && !isScaled ) {
        return null; // nothing to transform
    }

    bounds = layerToRect( layer );

    if ( isScaled ) {
        // we could scale the canvas context instead, but scaling the bounds means
        // that viewport pan logic will work "out of the box"
        bounds = scaleRectangle( bounds, scale );
    }

    const { width, height } = bounds;

    // 1. offset the canvas to make up for the viewport pan position

    ctx.translate( -viewport.left, -viewport.top );

    // 2. apply mirror transformation

    if ( isMirrored ) {
        ctx.scale( mirrorX ? -1 : 1, mirrorY ? -1 : 1 );
        ctx.translate( mirrorX ? -width : 0, mirrorY ? -height : 0 );

        // the below corrects for the inverted axes of the mirror, making sure
        // makes sure interactions (draw, draw) with the canvas feel natural

        if ( mirrorX ) {
            bounds.left = -bounds.left;
        }
        if ( mirrorY ) {
            bounds.top = -bounds.top;
        }
    }

    // 3. apply rotation

    let x = 0;
    let y = 0;
    if ( isRotated ) {
        const { x, y } = getRotationCenter({
            left : bounds.left,
            top  : bounds.top,
            width,
            height
        }, true );

        ctx.translate( x, y );
        ctx.rotate( mirrorX ? -rotation : rotation );
        ctx.translate( -x, -y );
    }
    return bounds;
};
