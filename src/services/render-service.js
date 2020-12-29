/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
import { getSpriteForLayer } from "@/factories/sprite-factory";
import { createCanvas }      from "@/utils/canvas-util";
import { getRotatedSize, getRotationCenter } from "@/utils/image-math";

const queue = [];

export const renderEffectsForLayer = async layer => {
    const { effects } = layer;
    const sprite = getSpriteForLayer( layer );

    if ( !sprite || !layer.source ) {
        return;
    }

    // if source is rotated, calculate the width and height for the current rotation
    const { width, height } = getRotatedSize( layer, effects.rotation );
    let cvs;
    if ( sprite._bitmap instanceof HTMLCanvasElement ) {
        cvs        = sprite._bitmap;
        cvs.width  = width;
        cvs.height = height;
    } else {
        ({ cvs } = createCanvas( width, height ));
    }
    const ctx = cvs.getContext( "2d" );

    if ( hasEffects( layer )) {
        await renderTransformedSource( layer, ctx, layer.source, width, height, effects );
    } else {
        ctx.drawImage( layer.source, 0, 0 );
    }

    // update on-screen canvas contents
    sprite.setBitmap( cvs, width, height );
    sprite.invalidate();
};

/* internal methods */

const hasEffects = ( layer ) => {
    if ( !!layer.mask ) {
        return true;
    }
    const { effects } = layer;
    return effects.rotation !== 0 || effects.mirrorX || effects.mirrorY;
};

const renderTransformedSource = async ( layer, ctx, sourceBitmap, width, height, { mirrorX, mirrorY, rotation }) => {
    const rotate = ( rotation % 360 ) !== 0;
    let targetX = mirrorX ? -width  : 0;
    let targetY = mirrorY ? -height : 0;

    const xScale = mirrorX ? -1 : 1;
    const yScale = mirrorY ? -1 : 1;

    ctx.save();
    ctx.scale( xScale, yScale );

    if ( rotate ) {
        const { x, y } = getRotationCenter({
            left   : 0,
            top    : 0,
            width  : mirrorX ? -width : width,
            height : mirrorY ? -height : height
        });
        ctx.translate( x, y );
        ctx.rotate( rotation );
        ctx.translate( -x, -y );
        targetX = x - layer.width  * .5;
        targetY = y - layer.height * .5;
    }
    ctx.drawImage( sourceBitmap, targetX, targetY );
    await renderMask( layer, ctx, targetX, targetY );

    ctx.restore();
}

const renderMask = async( layer, ctx, tX = 0, tY = 0 ) => {
    if ( !layer.mask ) {
        return;
    }
    ctx.save();
    ctx.translate( tX, tY );
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage( layer.mask, layer.maskX, layer.maskY );
    ctx.restore();
}
