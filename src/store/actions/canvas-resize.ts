/**
* The MIT License (MIT)
*
* Igor Zinken 2021-2022 - https://www.igorski.nl
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
import type { Store } from "vuex";
import type { Document, Layer } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import { getRendererForLayer } from "@/factories/renderer-factory";
import type { BitMapperyState } from "@/store";

type LayerOffsetDef = {
    id: string;
    left: number;
    top: number;
};

export const resizeCanvas = (
    store: Store<BitMapperyState>, activeDocument: Document, width: number, height: number, deltaX: number, deltaY: number
): void => {
    // store original and calculate new offsets for each Layer
    const orgLayerOffsets: LayerOffsetDef[] = [];
    const newLayerOffsets: LayerOffsetDef[] = [];

    const orgDocWidth  = activeDocument.width;
    const orgDocHeight = activeDocument.height;

    activeDocument.layers.forEach(({ id, left, top }) => {
        orgLayerOffsets.push({ id, left, top });
        newLayerOffsets.push({ id, left: left + deltaX, top: deltaY });
    });

    const updateOffsets = ( layers: Layer[], offsetList: LayerOffsetDef[] ): void => {
        layers.forEach( layer => {
            const { left, top } = offsetList.find(({ id }) => id === layer.id )!;
            layer.left = left;
            layer.top  = top;
        });
    };
    
    const commit = (): void => {
        updateOffsets( activeDocument.layers, newLayerOffsets );
        activeDocument.layers.forEach( layer => {
            const renderer = getRendererForLayer( layer );
            if ( renderer ) {
                renderer.getBounds().left += deltaX;
                renderer.getBounds().top  += deltaY;
            }
        });
        store.commit( "setActiveDocumentSize", { width, height });
    };
    commit();
    
    enqueueState( "resizeCanvas", {
        undo(): void {
            updateOffsets( activeDocument.layers, orgLayerOffsets );
            activeDocument.layers.forEach( layer => {
                const renderer = getRendererForLayer( layer );
                if ( renderer ) {
                    renderer.getBounds().left -= deltaX;
                    renderer.getBounds().top  -= deltaY;
                }
            });
            store.commit( "setActiveDocumentSize", { width: orgDocWidth, height: orgDocHeight });
        },
        redo: commit,
    });
};