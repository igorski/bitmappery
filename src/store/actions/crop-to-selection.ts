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
import type { Document } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import { getCanvasInstance } from "@/services/canvas-service";
import type { BitMapperyState } from "@/store";
import { cloneLayers, restoreFromClone } from "@/utils/document-util";
import { selectionToRectangle } from "@/utils/selection-util";

export const cropToSelection = ( store: Store<BitMapperyState>, activeDocument: Document ): void => {
    const currentSize = {
        width  : activeDocument.width,
        height : activeDocument.height
    };
    const orgContent = cloneLayers( activeDocument );
    const selection  = [ ...activeDocument.activeSelection ];
    const { left, top, width, height } = selectionToRectangle( selection );

    const commit = async (): Promise<void> => {
        await store.commit( "cropActiveDocumentContent", { left, top, width, height });
        store.commit( "setActiveDocumentSize", {
            width  : Math.min( currentSize.width  - left, width ),
            height : Math.min( currentSize.height - top,  height )
        });
        getCanvasInstance()?.interactionPane.setSelection( [], false );
    };
    commit();
    enqueueState( "crop", {
        async undo(): Promise<void> {
            restoreFromClone( activeDocument, orgContent );
            store.commit( "setActiveDocumentSize", currentSize );
            getCanvasInstance()?.interactionPane.setSelection( selection, false );
        },
        redo: commit
    });
};
