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
// @ts-expect-error TS7016 no type definitions for lodash.clonedeep
import cloneDeep from "lodash.clonedeep";
import type { Store } from "vuex";
import { type Layer } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import LayerFactory from "@/factories/layer-factory";
import type { BitMapperyState } from "@/store";
import { cloneCanvas } from "@/utils/canvas-util";

export const duplicateLayer = ( store: Store<BitMapperyState>, layerToClone: Layer, indexToAdd: number ): void => {
    const layer = LayerFactory.create({
        ...cloneDeep( layerToClone ),
        name: `${layerToClone.name} #2`,
        source: cloneCanvas( layerToClone.source ),
        mask: layerToClone.mask ? cloneCanvas( layerToClone.mask ) : null
    });

    const commit = () => store.commit( "insertLayerAtIndex", { index: indexToAdd, layer });
    commit();
    
    enqueueState( `duplicate_${indexToAdd}`, {
        undo(): void {
            store.commit( "removeLayer", indexToAdd );
        },
        redo: commit,
    });
};