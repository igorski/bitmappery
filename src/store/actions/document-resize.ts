
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
import { type Store } from "vuex";
import { type Size } from "zcanvas";
import { type Document } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import { type BitMapperyState } from "@/store";
import { cloneLayers, restoreFromClone } from "@/utils/document-util";

export const resizeDocument = async ( store: Store<BitMapperyState>, activeDocument: Document, dimensions: Size ): Promise<void> => {
    const originalWidth  = activeDocument.width;
    const originalHeight = activeDocument.height;

    const { width, height } = dimensions;
    const scaleX = width  / originalWidth;
    const scaleY = height / originalHeight;

    const { commit } = store;
    const orgContent = cloneLayers( activeDocument );

    const fn = async (): Promise<void> => {
        await commit( "resizeActiveDocumentContent", { scaleX, scaleY });
        commit( "setActiveDocumentSize", { width: Math.round( width ), height: Math.round( height ) });
    };

    enqueueState( "resizeDocument", {
        async undo(): Promise<void> {
            restoreFromClone( activeDocument, orgContent );
            commit( "setActiveDocumentSize", { width: originalWidth, height: originalHeight });
        },
        redo: fn,
    });
    return fn();
};
