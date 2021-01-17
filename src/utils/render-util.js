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
import BrushTypes from "@/definitions/brush-types";
import { createDrawable } from "@/factories/brush-factory";
import { distanceBetween, angleBetween, pointBetween, translatePointerRotation } from "@/math/point-math";
import { randomInRange } from "@/math/unit-math";
import { createCanvas, resizeImage } from "@/utils/canvas-util";

const { cos, sin } = Math;
const TWO_PI = Math.PI * 2;

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

export const renderBrushStroke = ( ctx, brush, sprite, optOverride ) => {
    let { pointers, radius, halfRadius, doubleRadius, options } = brush;
    let scale = 1;
    const { type } = options;

    if ( optOverride ) {
        pointers      = optOverride.pointers;
        scale         = optOverride.zoom;
        radius       *= scale;
        halfRadius   *= scale;
        doubleRadius *= scale;
    }

    if ( pointers.length < 2 ) {
        return;
    }

    ctx.save();
    ctx.lineJoin = ctx.lineCap = "round";

    for ( let i = 1; i < pointers.length; ++i ) {
        const prevPoint = pointers[ i - 1 ];
        const point     = pointers[ i ];

        if ( optOverride ) {
            prevPoint.x = ( prevPoint.x + optOverride.x ) * optOverride.scale;
            prevPoint.y = ( prevPoint.y + optOverride.y ) * optOverride.scale;
            point.x     = ( point.x + optOverride.x ) * optOverride.scale;
            point.y     = ( point.y + optOverride.y ) * optOverride.scale;
        }

        // paint brush types

        if ( type === BrushTypes.PAINT_BRUSH ) {
            const dist  = distanceBetween( prevPoint, point );
            const angle = angleBetween( prevPoint, point );

            const incr = radius * 0.25;
            const sin  = Math.sin( angle );
            const cos  = Math.cos( angle );

            let x, y, size, doubleSize;
            for ( let i = 0; i < dist; i += incr ) {
                x = prevPoint.x + ( sin * i );
                y = prevPoint.y + ( cos * i );
                ctx.fillStyle = createDrawable( brush, ctx, x, y, scale );
                ctx.fillRect( x - radius, y - radius, doubleRadius, doubleRadius );
            }
            continue;
        }

        if ( type === BrushTypes.SPRAY ) {
            ctx.fillStyle = brush.colors[ 0 ];
            for ( let i = doubleRadius; i--; ) {
                const angle = randomInRange( 0, TWO_PI );
                const size  = randomInRange( 1, 3 );
                ctx.fillRect(
                    point.x + randomInRange( -halfRadius, halfRadius ) * cos( angle ),
                    point.y + randomInRange( -halfRadius, halfRadius ) * sin( angle ),
                    size, size
                );
            }
            continue;
        }

        // line types

        ctx.lineWidth   = radius;
        ctx.strokeStyle = brush.colors[ 0 ];

        if ( type === BrushTypes.LINE ) {
            if ( i === 1 ) {
                ctx.beginPath();
                ctx.moveTo( prevPoint.x, prevPoint.y );
            }
            ctx.lineTo( point.x, point.y );
            ctx.stroke();
            continue;
        }

        if ( type === BrushTypes.CALLIGRAPHIC ) {
            if ( i === 1 ) {
                ctx.beginPath();
            }
            const min = ( radius * 0.25 ) * 0.66666;
            const max = ( radius * 0.25 ) * 1.33333;

            [ -max, -min, 0, min, max ].forEach( offset => {
                ctx.moveTo( prevPoint.x + offset, prevPoint.y + offset );
                ctx.lineTo( point.x + offset, point.y + offset );
                ctx.stroke();
            });
            continue;
        }

        // multi stroke line types

        let dX = 0
        let dY = 0;
        for ( let i = 0; i < options.strokes; ++i ) {
            switch ( type ) {
                default:
                case BrushTypes.PEN:
                    if ( i === 1 ) {
                        ctx.beginPath();
                        ctx.lineWidth = ( radius * 0.2 ) * randomInRange( 0.5, 1 );
                    }
                    ctx.moveTo( prevPoint.x - dX, prevPoint.y - dY );
                    ctx.lineTo( point.x - dX, point.y - dY );
                    ctx.stroke();
                    break;

                // this one benefits from working with a large point queue
                case BrushTypes.CURVED_PEN:
                    if ( i === 1 ) {
                        ctx.beginPath();
                        ctx.moveTo( prevPoint.x, prevPoint.y );
                    }
                    const midPoint = pointBetween( prevPoint, point );
                    ctx.quadraticCurveTo( pointer.x, pointer.y, midPoint.x, midPoint.y );
                    ctx.lineTo( point.x, point.y );
                    ctx.stroke();
                    break;
            }
            dX += randomInRange( 0, ctx.lineWidth );
            dY += randomInRange( 0, ctx.lineWidth );
        }
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
 */
export const renderClonedStroke = ( destContext, brush, sprite, sourceSprite, optPointers ) => {
    if ( !sourceSprite ) {
        return;
    }
    const { coords, opacity } = sprite._toolOptions;
    const { radius, doubleRadius, options } = brush;
    const { type } = options;
    const pointers = optPointers || brush.pointers;

    const source  = sourceSprite.getBitmap();
    const sourceX = ( coords.x - sourceSprite.getX()) - radius;
    const sourceY = ( coords.y - sourceSprite.getY()) - radius;

    const relSource = sprite._cloneStartCoords || sprite._dragStartEventCoordinates;

    // prepare temporary canvas (match size with brush)
    const { cvs, ctx } = tempCanvas;
    cvs.width  = doubleRadius;
    cvs.height = doubleRadius;

    for ( let i = 0; i < pointers.length; ++i ) {
        const destinationPoint = pointers[ i ];

        const xDelta  = sprite._dragStartOffset.x + (( destinationPoint.x - sprite._bounds.left ) - relSource.x );
        const yDelta  = sprite._dragStartOffset.y + (( destinationPoint.y - sprite._bounds.top )  - relSource.y );

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
