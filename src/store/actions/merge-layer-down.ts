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
import type { Store } from "vuex";
import type { Document, Layer } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import LayerFactory from "@/factories/layer-factory";
import type { BitMapperyState } from "@/store";
import { resizeImage } from "@/utils/canvas-util";
import { createSyncSnapshot } from "@/utils/document-util";

export const mergeLayerDown = async (
    store: Store<BitMapperyState>, activeDocument: Document, activeLayer: Layer, activeLayerIndex: number, name: string, allLayers = false,
): Promise<void> => {
    let layers: Layer[] = [];
    let layerIndices: number[] = [];
    // collect the layers in ascending order
    if ( allLayers ) {
        activeDocument.layers.forEach(( layer, index ) => {
            layers.push( layer );
            layerIndices.push( index );
        });
    } else {
        layerIndices = [ activeLayerIndex - 1, activeLayerIndex ];
        layers = [ activeDocument.layers[ layerIndices[ 0 ]], activeLayer ];
    }
    const { width, height } = activeDocument;
    const mergeIndex = allLayers ? 0 : layerIndices[ 0 ];
    const newLayer = LayerFactory.create({
        name,
        source: await resizeImage( createSyncSnapshot( activeDocument, layerIndices ), width, height ),
        width,
        height,
    });
    const commit = (): void => {
        let i = layerIndices.length;
        while ( i-- ) {
            store.commit( "removeLayer", layerIndices[ i ] );
        }
        store.commit( "insertLayerAtIndex", { index: mergeIndex, layer: newLayer });
    };
    commit();

    enqueueState( `merge_${mergeIndex}_${layers.length}`, {
        undo() {
            store.commit( "removeLayer", mergeIndex );
            layers.forEach(( layer, index ) => store.commit( "insertLayerAtIndex", { index: layerIndices[ index ], layer }));
        },
        redo: commit,
    });
};
