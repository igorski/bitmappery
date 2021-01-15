/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
import { canvas, loader } from "zcanvas";
import { PNG } from "@/definitions/image-types";
import { renderEffectsForLayer } from "@/services/render-service";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import { createCanvas, resizeToBase64 } from "@/utils/canvas-util";
import { getRectangleForSelection } from "@/math/selection-math";

/**
 * Creates a snapshot of the current document at its full size, returns a Blob.
 */
export const createDocumentSnapshot = async ( activeDocument, type, quality ) => {
    const { zcvs, cvs, ctx } = createFullSizeCanvas( activeDocument );
    const { width, height }  = activeDocument;

    // draw existing layers onto temporary canvas at full document scale
    const { layers } = activeDocument;
    for ( let i = 0, l = layers.length; i < l; ++i ) {
        const layer = layers[ i ];
        const sprite = getSpriteForLayer( layer );
        await renderEffectsForLayer( layer, false );
        sprite.draw( ctx, zcvs._viewport );
    }
    quality = parseFloat(( quality / 100 ).toFixed( 2 ));
    let base64 = cvs.toDataURL( type, quality );
    zcvs.dispose();

    // zCanvas magnifies content by the pixel ratio for a crisper result, downscale
    // to actual dimensions of the document
    const resizedImage = await resizeToBase64(
        base64,
        width  * ( window.devicePixelRatio || 1 ),
        height * ( window.devicePixelRatio || 1 ),
        width, height,
        type, quality
    );
    // fetch final base64 data so we can convert it easily to binary
    base64 = await fetch( resizedImage );
    return await base64.blob();
};

/**
 * Copy the selection defined in activeLayer into a separate Image
 */
export const copySelection = async ( activeDocument, activeLayer ) => {
    const { zcvs, cvs, ctx } = createFullSizeCanvas( activeDocument );
    const sprite = getSpriteForLayer( activeLayer );

    ctx.beginPath();
    activeDocument.selection.forEach(( point, index ) => {
        ctx[ index === 0 ? "moveTo" : "lineTo" ]( point.x, point.y );
    });
    ctx.closePath();
    ctx.save();
    ctx.clip();

    // draw active layer onto temporary canvas at full document scale
    sprite.draw( ctx, zcvs._viewport );
    ctx.restore();

    // when calculating the source rectangle we must take the device pixel ratio into account
    const pixelRatio = window.devicePixelRatio || 1;
    const selectionRectangle = getRectangleForSelection( activeDocument.selection );
    const selectionCanvas = createCanvas( selectionRectangle.width, selectionRectangle.height );
    selectionCanvas.ctx.drawImage(
        cvs,
        selectionRectangle.left  * pixelRatio, selectionRectangle.top    * pixelRatio,
        selectionRectangle.width * pixelRatio, selectionRectangle.height * pixelRatio,
        0, 0, selectionRectangle.width, selectionRectangle.height
    );
    zcvs.dispose();
    return await loader.loadImage( selectionCanvas.cvs.toDataURL( PNG ));
};

export const deleteSelectionContent = ( activeDocument, activeLayer ) => {
    const { x, y, width, height } = activeLayer;
    const { cvs, ctx } = createCanvas( width, height );

    // draw active layer onto temporary canvas at full document scale
    ctx.drawImage( activeLayer.source, 0, 0 );

    // erase content in selection area by filling with transparent pixels
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    if ( activeLayer.effects.rotation ) {
        const tX = width  * .5;
        const tY = height * .5;
        ctx.translate( tX, tY );
        ctx.rotate( -activeLayer.effects.rotation );
        ctx.translate( -tX, -tY );
    }
    ctx.beginPath();
    activeDocument.selection.forEach(( point, index ) => {
        ctx[ index === 0 ? "moveTo" : "lineTo" ]( point.x - x, point.y - y );
    });
    ctx.fill();
    ctx.restore();

    return cvs;
};

/* internal methods */

/**
 * Create a (temporary) instance of zCanvas at the full document size.
 * (as the current on-screen instance is a "best fit" for the screen size)
 */
function createFullSizeCanvas( object ) {
     const { width, height } = object;
     const zcvs = new canvas({ width, height, viewport: { width: width * 10, height: height * 10 } });
     const cvs  = zcvs.getElement();
     const ctx  = cvs.getContext( "2d" );

     return { zcvs, cvs, ctx };
 };
