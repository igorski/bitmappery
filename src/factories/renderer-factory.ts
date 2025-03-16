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
import LayerRenderer from "@/rendering/actors/layer-renderer";
import type ZoomableCanvas from "@/rendering/actors/zoomable-canvas";

/**
 * Renderers are used to represent layer content. These are mapped
 * to the layer ids (see layer-factory.js)
 */
const rendererCache = new Map();

/**
 * Runs given fn on each renderer in the cache
 * You can also pass in the active document to only run operations on
 * renderers of the layers of the current document
 */
export const runRendererFn = ( fn: ( renderer: LayerRenderer ) => void, optDocument?: Document ): void => {
    rendererCache.forEach(( renderer ) => {
        if ( !optDocument || optDocument.layers.includes( renderer.layer )) {
            fn( renderer );
        }
    });
};

/**
 * If a layer were to be removed / set to invisible, we
 * flush all its cached renderers.
 */
export const flushLayerRenderers = ( layer: Layer ): void => {
    //console.info( `flushing renderer for "${layer.id}"` );
    if ( hasRendererForLayer( layer )) {
        disposeRenderer( rendererCache.get( layer.id ));
        rendererCache.delete( layer.id );
    }
};

export const hasRendererForLayer = ({ id }: Partial<Layer> ): boolean => rendererCache.has( id );

export const getRendererForLayer = ({ id }: Partial<Layer> ): LayerRenderer | null => rendererCache.get( id ) || null;

/**
 * Clears the entire cache and disposes all renderers.
 */
export const flushRendererCache = (): void => {
    //console.info( "flushing renderer cache" );
    rendererCache.forEach( disposeRenderer );
    rendererCache.clear();
};

/**
 * Lazily retrieve / create a cached renderer to represent given
 * layer content on given zCanvas instance
 */
export const createRendererForLayer = ( zCanvasInstance: ZoomableCanvas, layer: Layer, isInteractive = false ): LayerRenderer => {
    const { id } = layer;
    let output;
    if ( hasRendererForLayer( layer )) {
        output = rendererCache.get( id );
    }
    // lazily create renderer
    if ( !output ) {
        output = new LayerRenderer( layer );
        output.setDraggable( true );
        output.setInteractive( isInteractive );
        zCanvasInstance.addChild( output );
        rendererCache.set( id, output );
    }
    return output;
};

/* internal methods */

function disposeRenderer( renderer: LayerRenderer ): void {
    renderer?.dispose();
}
