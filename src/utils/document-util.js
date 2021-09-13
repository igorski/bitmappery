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
import { createCanvas } from "@/utils/canvas-util";
import { createInverseClipping } from "@/rendering/clipping";
import { areEqual } from "@/math/rectangle-math";
import { getRectangleForSelection, isSelectionRectangular } from "@/math/selection-math";

/**
 * Creates a snapshot of the current document at its full size.
 */
export const createDocumentSnapshot = async ( activeDocument, type = PNG, quality = 95 ) => {
    const { zcvs, cvs, ctx } = createFullSizeCanvas( activeDocument );

    // ensure all layer effects are rendered, note we omit caching
    const { layers } = activeDocument;
    for ( let i = 0, l = layers.length; i < l; ++i ) {
        await renderEffectsForLayer( layers[ i ], false );
    }
    // draw existing layers onto temporary canvas at full document scale
    layers.forEach( layer => {
        getSpriteForLayer( layer )?.draw( ctx, zcvs._viewport, true );
    });
    zcvs.dispose();
    return cvs;
};

/**
 * Creates a full size render of the current Document contents synchronously.
 * NOTE: this assumes all effects are currently cached (!)
 */
export const renderFullSize = ( activeDocument, optLayerIndices = [] ) => {
    const { zcvs, cvs, ctx } = createFullSizeCanvas( activeDocument );

    // draw existing layers onto temporary canvas at full document scale
    const { layers } = activeDocument;
    layers.forEach(( layer, index ) => {
        // if a whitelist of layers has been provided, apply filter here
        if ( optLayerIndices.length && !optLayerIndices.includes( index )) {
            return;
        }
        getSpriteForLayer( layer )?.draw( ctx, zcvs._viewport, true );
    });
    zcvs.dispose();
    return cvs;
};

/**
 * Copy the selection defined in activeLayer into a separate Image
 */
export const copySelection = async ( activeDocument, activeLayer, copyMerged = false ) => {
    // render all layers if a merged copy was requested
    const merged = copyMerged ? await createDocumentSnapshot( activeDocument ) : null;

    const { zcvs, cvs, ctx } = createFullSizeCanvas( activeDocument );
    ctx.beginPath();
    activeDocument.selection.forEach(( point, index ) => {
        ctx[ index === 0 ? "moveTo" : "lineTo" ]( point.x, point.y );
    });
    ctx.closePath();
    if ( activeDocument.invertSelection ) {
        createInverseClipping( ctx, activeDocument.selection, 0, 0, activeDocument.width, activeDocument.height );
    }
    ctx.save();
    ctx.clip();

    if ( copyMerged ) {
        ctx.drawImage( merged, 0, 0 );
    } else {
        // draw active layer onto temporary canvas at full document scale
        const sprite = getSpriteForLayer( activeLayer );
        sprite.draw( ctx, zcvs._viewport, true );
    }
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
    const hasMask = !!activeLayer.mask;

    // draw active layer onto temporary canvas at full document scale
    ctx.drawImage( hasMask ? activeLayer.mask : activeLayer.source, 0, 0 );

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
    if ( activeDocument.invertSelection ) {
        createInverseClipping( ctx, activeDocument.selection, x, y, width, height );
    }
    ctx.fill();
    ctx.restore();

    return cvs;
};

export const getAlignableObjects = ( document, excludeLayer ) => {
    // create a rectangle describing the document boundaries
    const documentBounds = { x: 0, y: 0, width: document.width, height: document.height, visible: true };
    // create bounding boxes for all eligible objects
    return [ documentBounds, ...document.layers ].reduce(( acc, object ) => {
        // ignore this object in case
        // 1. it is an invisible layer
        // 2. it matches the size of the document (which is an alignable object in itself)
        // 3. it is the optionally provided excludeLayer
        if ( !object.visible ||
             ( object !== documentBounds && areEqual( documentBounds, object )) ||
             ( excludeLayer && object.id === excludeLayer.id )) {
            return acc;
        }
        // TODO take rotation into account ?
        const { x, y, width, height } = object;
        // 1. vertical top, center and bottom
        let guideWidth = document.width, guideHeight = 0;
        if ( y > 0 ) {
            acc.push({ x: 0, y, width: guideWidth, height: guideHeight });
        }
        acc.push({ x: 0, y: y + height / 2, width: guideWidth, height: guideHeight });
        if (( y + height ) < documentBounds.height ) {
            acc.push({ x: 0, y: y + height, width: guideWidth, height: guideHeight });
        }
        // 2. horizontal left, center and right
        guideWidth = 0, guideHeight = document.height;
        if ( x > 0 ) {
            acc.push({ x, y: 0, width: guideWidth, height: guideHeight });
        }
        acc.push({ x: x + width / 2, y: 0, width: guideWidth, height: guideHeight });
        if (( x + width ) < documentBounds.width ) {
            acc.push({ x: x + width, y: 0, width: guideWidth, height: guideHeight });
        }
        return acc;
    }, []);
}

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
}
