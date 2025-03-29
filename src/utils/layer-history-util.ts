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
import { type Layer } from "@/definitions/document";
import { getRendererForLayer } from "@/factories/renderer-factory";
import { enqueueState } from "@/factories/history-state-factory";
import { flushBlendedLayerCache, useBlendCaching } from "../rendering/cache/blended-layer-cache";

// NOTE we use getRendererForLayer() instead of passing the renderer by reference
// as it is possible the renderer originally rendering the Layer has been disposed
// and a new one has been created while traversing the change history

export function storeLayerPositionInHistory(
    layer: Layer, oldLayerX: number, oldLayerY: number, newLayerX: number, newLayerY: number,
    oldRendererX: number, oldRendererY: number, newRendererX: number, newRendererY: number,
): void {
    enqueueState( `layerPos_${layer.id}`, {
        undo(): void {
            positionRendererFromHistory( layer, oldRendererX, oldRendererY );
            layer.left = oldLayerX;
            layer.top  = oldLayerY;
        },
        redo(): void {
            positionRendererFromHistory( layer, newRendererX, newRendererY );
            layer.left = newLayerX;
            layer.top  = newLayerY;
        }
    });
}

export function storeMaskPositionInHistory( layer: Layer, oldMaskX: number, oldMaskY: number, newMaskX: number, newMaskY: number ): void {
    const commit = (): void => {
        layer.maskX = newMaskX;
        layer.maskY = newMaskY;
        getRendererForLayer( layer )?.resetFilterAndRecache();
    };
    commit();
    enqueueState( `maskPos_${layer.id}`, {
        undo(): void {
            layer.maskX = oldMaskX;
            layer.maskY = oldMaskY;
            getRendererForLayer( layer )?.resetFilterAndRecache();
        },
        redo: commit
    });
}

export function storePaintInHistory( layer: Layer, orgSourceBlobURL: string, newSourceBlobURL: string, isMask: boolean ): void {
    enqueueState( `layerPaint_${layer.id}`, {
        undo(): void {
            restorePaintFromHistory( layer, orgSourceBlobURL, isMask );
        },
        redo(): void {
            restorePaintFromHistory( layer, newSourceBlobURL, isMask );
        },
        resources: [ orgSourceBlobURL, newSourceBlobURL ],
    });
}

/* internal methods */

function positionRendererFromHistory( layer: Layer, x: number, y: number ): void {
    const renderer = getRendererForLayer( layer );
    if ( renderer ) {
        renderer.getBounds().left = x;
        renderer.getBounds().top  = y;
        if ( useBlendCaching() ) {
            flushBlendedLayerCache();
        }
        renderer.invalidate();
    }
}

function restorePaintFromHistory( layer: Layer, sourceToRestore: string, isMask: boolean ): void {
    const source = isMask ? layer.mask : layer.source;
    const ctx = source.getContext( "2d" ) as CanvasRenderingContext2D;
    ctx.clearRect( 0, 0, source.width, source.height );
    const image  = new Image();
    image.onload = () => {
        ctx.drawImage( image, 0, 0 );
        getRendererForLayer( layer )?.resetFilterAndRecache();
    };
    image.src = sourceToRestore;
}
