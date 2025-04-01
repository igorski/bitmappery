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

export function replaceLayerSource( layer: Layer, orgSourceBlobURL: string, newSourceBlobURL: string, isMask: boolean ): void {
    enqueueState( `layerSource_${layer.id}`, {
        undo(): void {
            restoreSource( layer, orgSourceBlobURL, isMask );
        },
        redo(): void {
            restoreSource( layer, newSourceBlobURL, isMask );
        },
        resources: [ orgSourceBlobURL, newSourceBlobURL ],
    });
}

/* internal methods */

function restoreSource( layer: Layer, sourceToRestore: string, isMask: boolean ): void {
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
