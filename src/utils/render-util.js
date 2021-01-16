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
import { LAYER_TEXT } from "@/definitions/layer-types";
import { createDrawable } from "@/factories/brush-factory";
import { distanceBetween, angleBetween, translatePointerRotation } from "@/math/point-math";
import { createCanvas, resizeImage } from "@/utils/canvas-util";

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

export const renderBrushStroke = ( sprite, brush, ctx, destinationPoint ) => {
    const { pointer, radius, doubleRadius } = brush;

    // effects complicate proceedings https://github.com/igorski/bitmappery/issues/2
    const { rotation, mirrorX, mirrorY } = sprite.layer.effects;
    if ( rotation || mirrorX || mirrorY ) {
        ctx.fillStyle = createDrawable( brush, ctx, destinationPoint.x, destinationPoint.y )
        ctx.fillRect( destinationPoint.x - radius, destinationPoint.y - radius, doubleRadius, doubleRadius );
        return;
    }

    ctx.save();
    ctx.lineJoin = ctx.lineCap = "round";

    const dist  = distanceBetween( pointer, destinationPoint );
    const angle = angleBetween( pointer, destinationPoint );

    const incr  = brush.radius * 0.25;
    const sin   = Math.sin( angle );
    const cos   = Math.cos( angle );

    let x, y;
    for ( let i = 0; i < dist; i += incr ) {
        x = pointer.x + ( sin * i );
        y = pointer.y + ( cos * i );
        ctx.fillStyle = createDrawable( brush, ctx, x, y )
        ctx.fillRect( x - radius, y - radius, doubleRadius, doubleRadius );
    }
    ctx.restore();
};

/**
 * Masks the contents of given source using given brushCvs, and renders the result onto given destContext.
 * Used by clone stamp tool.
 *
 * @param {CanvasRenderingContext2D} destContext
 * @param {zCanvas.sprite} sprite
 * @param {zCanvas.sprite} sourceSprite containing the bitmap to mask (see getBitmap())
 * @param {Object} brush operation to use
 * @param {{ x: number, y:number }} destinationPoint coordinate relative to given destContext
 */
export const renderClonedStroke = ( destContext, sprite, sourceSprite, brush, destinationPoint ) => {
    const maskRadius = brush.radius;

    const { coords, opacity } = sprite._toolOptions;
    const source = sourceSprite.getBitmap();
    const relSource = sprite._cloneStartCoords ?? sprite._dragStartEventCoordinates;

    const sourceX = ( coords.x - sourceSprite.getX()) - maskRadius;
    const sourceY = ( coords.y - sourceSprite.getY()) - maskRadius;
    const xDelta  = sprite._dragStartOffset.x + (( destinationPoint.x - sprite._bounds.left ) - relSource.x );
    const yDelta  = sprite._dragStartOffset.y + (( destinationPoint.y - sprite._bounds.top )  - relSource.y );

    // prepare temporary canvas (match size with brush)
    const { cvs, ctx } = tempCanvas;
    cvs.width  = brush.doubleRadius;
    cvs.height = brush.doubleRadius;

    ctx.globalAlpha = opacity;

    // draw source bitmap data onto temporary canvas
    ctx.drawImage(
        source, sourceX + xDelta, sourceY + yDelta, maskRadius, maskRadius,
        0, 0, maskRadius, maskRadius
    );

    // draw the brush above the bitmap, keeping only the overlapping area
    ctx.globalCompositeOperation = "destination-in";
    // note we use the brush.pointer as the destination too
    renderBrushStroke( sprite, brush, ctx, brush.pointer );

    // draw the masked result onto the destination canvas
    destContext.drawImage(
        cvs, 0, 0, maskRadius, maskRadius,
        destinationPoint.x - maskRadius, destinationPoint.y - maskRadius, maskRadius, maskRadius
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
