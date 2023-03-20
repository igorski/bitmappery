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
import type { Rectangle, Viewport } from "zcanvas";
import type { Document, Layer } from "@/definitions/document";
import { layerToRect } from "@/factories/layer-factory";
import { scaleRectangle, getRotationCenter } from "@/math/rectangle-math";

let bounds: Rectangle;

/**
 * Prepare given ctx to perform drawing operations for mirrored, scaled or
 * rotated content. Prior to invoking this function the context should be saved
 * and subsequently restored after drawing.
 *
 * The use case here is to transform a Layers source content in the renderer
 * to represent the Layer taking its optional transformations into account.
 *
 * This method returns a transformed bounding box that describes the actual
 * bounding box of the Layer after transformation. (when using these bounds with
 * a ZoomableSprites draw-routine, this would allow for easy re-use of the existing zCanvas API)
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Layer} layer to be rendering the contents of
 * @param {Object=} viewport optional ZoomableCanvas viewport (when using within a sprite)
 * @return {Rectangle|null} null when no transformation took place, updated bounds Object when
 *                       transformation did take place.
 */
export const applyTransformation = ( ctx: CanvasRenderingContext2D, layer: Layer, viewport: Partial<Viewport> = { left: 0, top: 0 }): Rectangle => {
    const { mirrorX, mirrorY, scale, rotation } = layer.effects;

    const isMirrored = mirrorX || mirrorY;
    const isScaled   = scale !== 1;
    const isRotated  = rotation % 360 !== 0;

    if ( !isMirrored && !isRotated && !isScaled ) {
        return null; // nothing to transform
    }

    bounds = layerToRect( layer );

    // 1. apply the appropriate layer scaling

    if ( isScaled ) {
        // we could scale the canvas context instead, but scaling the bounds means
        // that viewport pan logic will work "out of the box"
        bounds = scaleRectangle( bounds, scale );
    }

    const { width, height } = bounds;

    // 2. offset the canvas to make up for the viewport pan position

    ctx.translate( -viewport.left, -viewport.top );

    // 3. apply mirror transformation

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

    // 4. apply rotation

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

/**
 * Prepare given ctx to perform drawing operations ON THE SOURCE of mirrored, scaled or
 * rotated content. Prior to invoking this function the context should be saved
 * and subsequently restored after drawing.
 *
 * The use case here is to make changes to the source when performing them within
 * the editor UI (e.g. relative to the renderer output of a LayerSprites content
 * that has been transformed using applyTransformation()).
 * In this case, the coordinates of the on-screen manipulations need to be translated
 * in reverse in order to be applied to the appropriate origin.
 *
 * This method returns a transformed bounding box that describes the bounding box
 * relative to the Layers source if no transformations were present on the Layer
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Layer} layer to be rendering the contents of
 * @return {Rectangle|null} null when no transformation took place, updated bounds Object when
 *                       transformation did take place.
 */
export const reverseTransformation = ( ctx: CanvasRenderingContext2D, layer: Layer ): Rectangle => {
    const { mirrorX, mirrorY, scale, rotation } = layer.effects;

    const isMirrored = mirrorX || mirrorY;
    const isScaled   = scale !== 1;
    const isRotated  = rotation % 360 !== 0;

    if ( !isMirrored && !isRotated && !isScaled ) {
        return null; // nothing to transform
    }

    bounds = layerToRect( layer );

    const { width, height } = bounds;

    // 1. apply mirror transformation

    if ( isMirrored ) {
        ctx.scale( mirrorX ? -1 : 1, mirrorY ? -1 : 1 );
        ctx.translate( mirrorX ? -width : 0, mirrorY ? -height : 0 );
    }

    // 2. apply rotation

    if ( isRotated ) {
        const tX = width  * 0.5;
        const tY = height * 0.5;

        ctx.translate( tX, tY );
        ctx.rotate( mirrorY ? rotation : -rotation );
        ctx.translate( -tX, -tY );
    }

    // 3. apply scale

    if ( isScaled ) {
        ctx.scale( 1 / scale, 1 / scale );

        const scaled = scaleRectangle( bounds, scale );

        // offset the returned bounds by the delta between the scaled and unscaled bounds

        bounds.left -= ( scaled.width  - bounds.width )  * 0.5;
        bounds.top  -= ( scaled.height - bounds.height ) * 0.5;
    }
    return bounds;
};
