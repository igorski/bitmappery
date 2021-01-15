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
import { createCanvas, resizeImage } from "@/utils/canvas-util";
import { LAYER_TEXT } from "@/definitions/layer-types";

const tempCanvas = createCanvas();

export const renderCross = ( ctx, x, y, size ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo( x - size, y - size );
    ctx.lineTo( x + size, y + size );
    ctx.moveTo( x + size, y - size );
    ctx.lineTo( x - size, y + size );
    ctx.stroke();
    ctx.restore();
};

/**
 * Masks the contents of given source using given brushCvs, and renders the result onto given destContext.
 * Used by clone stamp tool.
 *
 * @param {CanvasRenderingContext2D} destContext
 * @param {zCanvas.sprite} sprite
 * @param {number} destX destination x-coordinate relative to given destContext
 * @param {number} destY destination y-coordinate relative to given destContext
 * @param {zCanvas.sprite} sourceSprite containing the bitmap to mask (see getBitmap())
 * @param {HTMLCanvasElement} brushCvs mask image to use
 * @param {number} maskRadius radius of the mask (determines mask size)
 */
export const renderMasked = ( destContext, sprite, destX, destY, sourceSprite, brushCvs, maskRadius ) => {
    const { coords, opacity } = sprite._toolOptions;
    const source = sourceSprite.getBitmap();
    const relSource = sprite._cloneStartCoords ?? sprite._dragStartEventCoordinates;

    const sourceX = ( coords.x - sourceSprite.getX()) - maskRadius;
    const sourceY = ( coords.y - sourceSprite.getY()) - maskRadius;
    const xDelta  = sprite._dragStartOffset.x + (( destX - sprite._bounds.left ) - relSource.x );
    const yDelta  = sprite._dragStartOffset.y + (( destY - sprite._bounds.top )  - relSource.y );

    // prepare temporary canvas (match size with brush)
    const { cvs, ctx } = tempCanvas;
    cvs.width  = brushCvs.width;
    cvs.height = brushCvs.height;

    ctx.globalAlpha = opacity;

    // draw source bitmap data onto temporary canvas
    ctx.drawImage(
        source, sourceX + xDelta, sourceY + yDelta, maskRadius, maskRadius,
        0, 0, maskRadius, maskRadius
    );

    // draw the brush above the bitmap, keeping only the overlapping area
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage( brushCvs, 0, 0 );

    // draw the masked result onto the destination canvas
    destContext.drawImage(
        cvs, 0, 0, maskRadius, maskRadius,
        destX - maskRadius, destY - maskRadius, maskRadius, maskRadius
    );
};

export const resizeLayerContent = async ( layer, ratioX, ratioY ) => {
    const { source, mask } = layer;

    layer.source = await resizeImage(
        source, source.width, source.height, source.width * ratioX, source.height * ratioY
    );
    if ( mask ) {
        layer.mask = await resizeImage(
            mask, mask.width, mask.height, mask.width * ratioX, mask.height * ratioY
        );
        layer.maskX *= ratioX;
        layer.maskY *= ratioY;
    }
    layer.x      *= ratioX;
    layer.y      *= ratioY;
    layer.width  *= ratioX;
    layer.height *= ratioY;

    if ( layer.type === LAYER_TEXT ) {
        const { text } = layer;

        text.size       *= ratioX;
        text.spacing    *= ratioX;
        text.lineHeight *= ratioY;
    }
};

export const cropLayerContent = async ( layer, left, top ) => {
    if ( layer.mask ) {
        layer.maskX -= left;
        layer.maskY -= top;
    }
    layer.x -= left;
    layer.y -= top;
};
