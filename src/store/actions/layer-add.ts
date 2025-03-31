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
import { type Store } from "vuex";
import { type Layer } from "@/definitions/document";
import { LayerTypes } from "@/definitions/layer-types";
import ToolTypes from "@/definitions/tool-types";
import { enqueueState } from "@/factories/history-state-factory";
import { type BitMapperyState } from "@/store";

export const addLayer = ( store: Store<BitMapperyState>, layer: Layer, index: number ): void => {
    const commit = (): void => {
        store.commit( "insertLayerAtIndex", { index, layer });
    };
    commit();
    
    // only on initial creation
    if ( layer.type === LayerTypes.LAYER_TEXT ) {
        store.commit( "setActiveTool", { tool: ToolTypes.TEXT });
    }

    enqueueState( `layerAdd_${index}`, {
        undo(): void {
            store.commit( "removeLayer", index );
        },
        redo: commit,
    });
};