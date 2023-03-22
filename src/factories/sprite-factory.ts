/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
import type { Document, Layer } from "@/definitions/document";
import LayerSprite from "@/rendering/canvas-elements/layer-sprite";
import type ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";

let zCanvasInstance: ZoomableCanvas = null; // a non-Vue observable zCanvas instance

export const getCanvasInstance = (): ZoomableCanvas | null => zCanvasInstance;
export const setCanvasInstance = ( zCanvas: ZoomableCanvas ): void => {
    zCanvasInstance = zCanvas;
};

/**
 * Sprites are used to represent layer content. These are mapped
 * to the layer ids (see layer-factory.js)
 */
const spriteCache = new Map();

/**
 * Runs given fn on each Sprite in the cache
 * You can also pass in the active document to only run operations on
 * sprites rendering the layers of the current document
 */
export const runSpriteFn = ( fn: ( sprite: LayerSprite ) => void, optDocument?: Document ): void => {
    spriteCache.forEach(( sprite ) => {
        if ( !optDocument || optDocument.layers.includes( sprite.layer )) {
            fn( sprite );
        }
    });
};

/**
 * If a layer were to be removed / set to invisible, we
 * flush all its cached Sprites.
 */
export const flushLayerSprites = ( layer: Layer ): void => {
    //console.info( `flushing sprite for "${layer.id}"` );
    if ( hasSpriteForLayer( layer )) {
        disposeSprite( spriteCache.get( layer.id ));
        spriteCache.delete( layer.id );
    }
};

export const hasSpriteForLayer = ( layer?: Layer ): boolean => spriteCache.has( layer?.id );

export const getSpriteForLayer = ( layer?: Layer ): LayerSprite | null => spriteCache.get( layer?.id ) || null;

/**
 * Clears the entire cache and disposes all Sprites.
 */
export const flushCache = (): void => {
    //console.info( "flushing sprite cache" );
    spriteCache.forEach( disposeSprite );
    spriteCache.clear();
};

/**
 * Lazily retrieve / create a cached sprite to represent given
 * layer content on given zCanvas instance
 */
export const createSpriteForLayer = ( zCanvasInstance: ZoomableCanvas, layer: Layer, isInteractive = false ): LayerSprite => {
    const { id } = layer;
    let output;
    if ( hasSpriteForLayer( layer )) {
        output = spriteCache.get( id );
    }
    // lazily create sprite
    if ( !output ) {
        output = new LayerSprite( layer );
        output.setDraggable( true );
        output.setInteractive( isInteractive );
        zCanvasInstance.addChild( output );
        spriteCache.set( id, output );
    }
    return output;
};

/* internal methods */

function disposeSprite( sprite: LayerSprite ): void {
    sprite?.dispose();
}
