/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
import { type Store } from "vuex";
import type { Document } from "@/model/types/document";
import type { Layer } from "@/model/types/layer";
import { enqueueState } from "@/model/factories/history-state-factory";
import { type BitMapperyState } from "@/store";

export const cutLayerContent = ( store: Store<BitMapperyState>, layers: Layer[] ): void => {
    const { commit, getters } = store;

    const layerIndices = layers.map( layer => {
        return ( getters.activeDocument as Document ).layers.findIndex(({ id }) => id === layer.id );
    });
    
    const act = (): void => {
        commit( "setCopiedContent", {
            type: "layer",
            content: layers,
        });
        let i = layerIndices.length;
        while ( i-- ) {
            commit( "removeLayer", layerIndices[ i ]);
        }
    };
    act();

    enqueueState( `cut_layers_${layers.length}`, {
        undo(): void {
            for ( let i = 0; i < layers.length; ++i ) {
                commit( "insertLayerAtIndex", { index: layerIndices[ i ], layer: layers[ i ]} );
            }
        },
        redo: act
    });
};