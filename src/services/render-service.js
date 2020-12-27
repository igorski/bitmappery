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
import { getRotationCenter } from "@/utils/image-math";

const queue = [];

export const renderEffectsForLayer = async layer => {
    const { effects } = layer;
    const sprite = getSpriteForLayer( layer );

    if ( !sprite ) {
        return;
    }

    const { width, height } = layer;
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
        await renderTransformations( ctx, layer.source, width, height, effects.rotation );
    } else {
        ctx.drawImage( layer.source, 0, 0 );
    }

    // update on-screen canvas contents
    sprite.setBitmap( cvs, width, height );
    sprite.cacheMask();
    sprite.invalidate();
};

/* internal methods */

const hasEffects = ({ effects }) => {
    return effects.rotation !== 0;
};

const renderTransformations = async ( ctx, sourceBitmap, width, height, rotation ) => {
    const { x, y } = getRotationCenter({ left: 0, top: 0, width, height });

    ctx.save();
    ctx.translate( x, y );
    ctx.rotate( rotation );
    ctx.translate( -x, -y );
    ctx.drawImage( sourceBitmap, 0, 0 );
    ctx.restore();
}
