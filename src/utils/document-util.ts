/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
import type { Rectangle, SizedImage } from "zcanvas";
import { PNG } from "@/definitions/image-types";
import type { Document, Shape, Layer } from "@/definitions/document";
import { renderEffectsForLayer } from "@/services/render-service";
import { createSpriteForLayer, getSpriteForLayer } from "@/factories/sprite-factory";
import { rotateRectangle, areEqual } from "@/math/rectangle-math";
import { fastRound } from "@/math/unit-math";
import { reverseTransformation } from "@/rendering/transforming";
import type ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";
import { createCanvas, getPixelRatio } from "@/utils/canvas-util";
import { SmartExecutor } from "@/utils/debounce-util";
import { selectionToRectangle } from "@/utils/selection-util";

/**
 * Creates a snapshot of the current document. THIS MULTIPLIES FOR THE DEVICE PIXEL RATIO
 * (as it mimics the onscreen presentation of zCanvas)
 */
export const createDocumentSnapshot = async ( activeDocument: Document ): Promise<HTMLCanvasElement> => {
    const { zcvs, cvs, ctx } = createFullSizeZCanvas( activeDocument );

    // ensure all layer effects are rendered, note we omit caching
    const { layers } = activeDocument;
    for ( let i = 0, l = layers.length; i < l; ++i ) {
        await renderEffectsForLayer( layers[ i ], false );
    }
    // draw existing layers onto temporary canvas at full document scale
    layers.forEach( layer => {
        getSpriteForLayer( layer )?.draw( ctx, zcvs.getViewport(), true );
    });
    zcvs.dispose();

    return cvs;
};

/**
 * Creates a snapshot of the provided layer. When an activeDocument is provided, it's boundary box
 * will crop the layer. THIS MULTIPLIES FOR THE DEVICE PIXEL RATIO (as it mimics the onscreen presentation of zCanvas)
 */
export const createLayerSnapshot = async ( layer: Layer, optActiveDocument?: Document): Promise<HTMLCanvasElement> => {
    const width  = optActiveDocument ? optActiveDocument.width  : layer.width;
    const height = optActiveDocument ? optActiveDocument.height : layer.height;

    const { zcvs, cvs, ctx } = createFullSizeZCanvas({ width, height });

    // if the layer is currently invisible, it has no sprite, create it lazily here.
    const sprite = !layer.visible ? createSpriteForLayer( zcvs as ZoomableCanvas, layer, false ) : getSpriteForLayer( layer );

    // ensure all layer effects are rendered, note we omit caching
    await renderEffectsForLayer( layer, false );

    // draw existing layers onto temporary canvas at full document scale
    sprite?.draw( ctx, zcvs.getViewport(), true );
    zcvs.dispose();

    return cvs;
};

/**
 * Creates a snapshot of the currently visible Document contents synchronously.
 * NOTE 1: this assumes all effects are currently cached (!).
 * NOTE 2: THIS MULTIPLIES FOR THE DEVICE PIXEL RATIO
 * optLayerIndices is optional whitelist of layers to render, defaults
 * to render all layers unless specified
 */
export const createSyncSnapshot = ( activeDocument: Document, optLayerIndices: number[] = [] ): HTMLCanvasElement => {
    const { zcvs, cvs, ctx } = createFullSizeZCanvas( activeDocument );

    // draw existing layers onto temporary canvas at full document scale
    const { layers } = activeDocument;
    layers.forEach(( layer, index ) => {
        // if a whitelist of layers has been provided, apply filter here
        if ( optLayerIndices.length && !optLayerIndices.includes( index )) {
            return;
        }
        getSpriteForLayer( layer )?.draw( ctx, zcvs.getViewport(), true );
    });
    zcvs.dispose();

    return cvs;
};

/**
 * Slice the contents of given bitmap using a grid of given dimensions
 * into a list of grid-sized bitmaps.
 */
export const sliceTiles = async ( sourceBitmap: HTMLImageElement, tileWidth: number, tileHeight: number ): Promise<HTMLCanvasElement[]> => {
    const { width, height } = sourceBitmap;
    const out: HTMLCanvasElement[] = [];

    const smartExec = new SmartExecutor(); // this operation can get heavy on large documents

    for ( let y = 0; y < height; y += tileHeight ) {
       for ( let x = 0; x < width; x += tileWidth ) {
            // ensure the current slice isn't exceeding the sourceBitmap bounds
            const w = ( x + tileWidth > width ) ? ( x + tileWidth - width ) : tileWidth;
            const h = ( y + tileHeight > height ) ? ( y + tileHeight - height ) : tileHeight;

            const { cvs, ctx } = createCanvas( w, h );
            ctx.drawImage( sourceBitmap, x, y, w, h, 0, 0, w, h );
            out.push( cvs );

            await smartExec.waitWhenBusy();
        }
    }
    return out.reverse();
};

/**
 * Combines the contents of a list of tiles into a single image where the tiles
 * are spread across the given amountOfColumns for as many rows as necessary
 *
 * @param {Array<HTMLCanvasElement>} tiles
 * @param {Number} tileWidth width of an individual tile
 * @param {Number} tileHeight height of an individual tile
 * @param {Number} amountOfColumns amount of columns to generate in the destination image
 * @return {HTMLCanvasElement}
 */
export const tilesToSingle = ( tiles: HTMLCanvasElement[], tileWidth: number, tileHeight: number, amountOfColumns: number ): HTMLCanvasElement => {
    const amountOfRows = Math.ceil( tiles.length / amountOfColumns );
    const width  = amountOfColumns * tileWidth;
    const height = amountOfRows * tileHeight;

    const { cvs, ctx } = createCanvas( width, height );
    let x = 0, y = 0;
    tiles.forEach( tile => {
        ctx.drawImage( tile, 0, 0, tile.width, tile.height, x * tileWidth, y * tileHeight, tileWidth, tileHeight );
        if ( ++x === amountOfColumns ) {
            x = 0;
            ++y;
        }
    });
    return cvs;
};

  
/**
 * Copy the selection defined in activeLayer into a separate Image
 */
export const copySelection = async ( activeDocument: Document, activeLayer: Layer, copyMerged = false ): Promise<SizedImage> => {
    const { zcvs, cvs, ctx } = createFullSizeZCanvas( activeDocument );

    ctx.save();
    ctx.beginPath();
    activeDocument.activeSelection.forEach(( shape: Shape ) => {
        shape.forEach(( point, index ) => {
            ctx[ index === 0 ? "moveTo" : "lineTo" ]( fastRound( point.x ), fastRound( point.y ));
        });
    });
    ctx.closePath();

    if ( activeDocument.invertSelection ) {
        ctx.globalCompositeOperation = "destination-in";
    }
    ctx.clip();

    if ( copyMerged ) {
        // render all layers if a merged copy was requested
        const mergedSnapshot = await createDocumentSnapshot( activeDocument );
        ctx.drawImage( mergedSnapshot, 0, 0, activeDocument.width, activeDocument.height );
    } else {
        // draw active layer onto temporary canvas
        ctx.drawImage( await createLayerSnapshot( activeLayer ), 0, 0, activeDocument.width, activeDocument.height );
    }
    ctx.restore();

    // note that when calculating the source rectangle we must take the device pixel ratio into account
    const pixelRatio = getPixelRatio();
    const selectionRectangle = selectionToRectangle( activeDocument.activeSelection );
    const selectionCanvas = createCanvas( selectionRectangle.width, selectionRectangle.height );
    selectionCanvas.ctx.drawImage(
        cvs,
        selectionRectangle.left  * pixelRatio, selectionRectangle.top    * pixelRatio,
        selectionRectangle.width * pixelRatio, selectionRectangle.height * pixelRatio,
        0, 0, selectionRectangle.width, selectionRectangle.height
    );
    zcvs.dispose();
    return await loader.loadImage( selectionCanvas.cvs.toDataURL( PNG.mime ));
};

/**
 * Deletes the pixel content inside the active selection of the document by
 * returning a new document bitmap without the selection contents
 */
export const deleteSelectionContent = ( activeDocument: Document, activeLayer: Layer ): HTMLCanvasElement => {
    let { left, top, width, height } = activeLayer;
    const { cvs, ctx } = createCanvas( width, height );
    const hasMask = !!activeLayer.mask;

    // draw active layer onto temporary canvas at full document scale
    ctx.drawImage( hasMask ? activeLayer.mask : activeLayer.source, 0, 0 );

    // erase content in selection area by filling with transparent pixels
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    const transformedBounds = reverseTransformation( ctx, activeLayer );
    if ( !!transformedBounds ) {
       ({ left, top, width, height } = transformedBounds );
    }

    ctx.beginPath();
    activeDocument.activeSelection.forEach( selection => {
        selection.forEach(( point, index ) => {
            ctx[ index === 0 ? "moveTo" : "lineTo" ]( point.x - left, point.y - top );
        });
    });
    ctx.closePath();

    if ( activeDocument.invertSelection ) {
        ctx.globalCompositeOperation = "destination-in";
    }
    ctx.fill();
    ctx.restore();

    return cvs;
};

/**
 * Retrieve a list of rectangles that describe the bounding boxes of
 * elements inside the document that can snapped/aligned to
 *
 * @param {Object} document
 * @param {Object=} excludeLayer optional layer to exclude
 * @return {Array<Object>} list of rectangles to align to
 */
export const getAlignableObjects = ( document: Document, excludeLayer?: Layer ): Rectangle[] => {
    // create a rectangle describing the document boundaries
    const documentBounds = {
        left: 0, top: 0, width: document.width, height: document.height, visible: true
    } as Partial<Layer>;
    // create bounding boxes for all eligible objects
    return [ documentBounds, ...document.layers ].reduce(( acc, object ) => {
        // ignore this object in case
        // 1. it is an invisible layer
        // 2. it matches the size of the document (which is an alignable object in itself)
        // 3. it is the optionally provided excludeLayer
        if ( !object.visible ||
             ( object !== documentBounds && areEqual( documentBounds as Rectangle, object as Rectangle )) ||
             ( excludeLayer && object.id === excludeLayer.id )) {
            return acc;
        }
        const { left, top, width, height } = rotateRectangle( object as Rectangle, object.effects?.rotation );
        // 1. vertical top, center and bottom
        let guideWidth = document.width, guideHeight = 0;
        if ( top > 0 ) {
            acc.push({ left: 0, top, width: guideWidth, height: guideHeight });
        }
        acc.push({ left: 0, top: top + height / 2, width: guideWidth, height: guideHeight });
        if (( top + height ) < documentBounds.height ) {
            acc.push({ left: 0, top: top + height, width: guideWidth, height: guideHeight });
        }
        // 2. horizontal left, center and right
        guideWidth = 0, guideHeight = document.height;
        if ( left > 0 ) {
            acc.push({ left, top: 0, width: guideWidth, height: guideHeight });
        }
        acc.push({ left: left + width / 2, top: 0, width: guideWidth, height: guideHeight });
        if (( left + width ) < documentBounds.width ) {
            acc.push({ left: left + width, top: 0, width: guideWidth, height: guideHeight });
        }
        return acc;
    }, []);
}

/* internal methods */

/**
 * Create a (temporary) instance of zCanvas at the full document size.
 * (as the current on-screen instance is a "best fit" for the screen size)
 */
function createFullSizeZCanvas( object: { width: number, height: number } ): { zcvs: canvas, cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D } {
     const { width, height } = object;
     const zcvs = new canvas({ width, height, viewport: { width: width * 10, height: height * 10 } });
     const cvs  = zcvs.getElement() as HTMLCanvasElement;
     const ctx  = cvs.getContext( "2d" )!;

     return { zcvs, cvs, ctx };
}
