/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022 - https://www.igorski.nl
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
import { enqueueState } from "@/factories/history-state-factory";
import type { BitMapperyState } from "@/store";

/**
 * @param {Object} store reference
 * @param {Number} index index of layer to toggle visibility of
 */
export const toggleLayerVisibility = ( store: Store<BitMapperyState>, index: number ): void => {
    const originalVisibility = store.getters.layers[ index ].visible;
    const commit = () => store.commit( "updateLayer", { index, opts: { visible: !originalVisibility } });
    commit();
    enqueueState( `layerVisibility_${index}`, {
        undo() {
            store.commit( "updateLayer", { index, opts: { visible: originalVisibility } });
        },
        redo: commit,
    });
};
