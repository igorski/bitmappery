/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2026 - https://www.igorski.nl
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
import { enqueueState } from "@/factories/history-state-factory";
import { getRendererForLayer } from "@/factories/renderer-factory";
import { type BitMapperyState } from "@/store";
import { cloneCanvas } from "@/utils/canvas-util";
import { deleteSelectionContent } from "@/utils/document-util";
import { replaceLayerSource } from "@/utils/layer-util";

export const deleteSelection = ( store: Pick<Store<BitMapperyState>, "getters"> ): void => {
    const { activeLayer, activeLayerMask, activeDocument } = store.getters;

    if ( !activeLayer || !activeDocument?.activeSelection.length ) {
        return;
    }
    const hasMask       = !!activeLayer.mask && activeLayerMask === activeLayer.mask;
    const orgContent    = cloneCanvas( hasMask ? activeLayer.mask : activeLayer.source );
    const updatedBitmap = deleteSelectionContent( activeDocument, activeLayer );

    const replaceSource = ( newSource: HTMLCanvasElement ) => {
        replaceLayerSource( activeLayer, newSource, hasMask );
        getRendererForLayer( activeLayer )?.resetFilterAndRecache();
    };
    replaceSource( updatedBitmap );
    enqueueState( `deleteFromSelection_${activeLayer.id}`, {
        undo(): void {
            replaceSource( orgContent );
        },
        redo(): void {
            replaceSource( updatedBitmap );
        },
    });
};