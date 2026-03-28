
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
import type { Document, DocumentMeta } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import { rebuildAllTiles } from "@/rendering/cache/tile-cache";
import { getCanvasInstance } from "@/services/canvas-service";
import { type BitMapperyState } from "@/store";

export const TRANSPARENT_COLOR = "#FFFFFF00"; 

export const editDocumentProperties = async (
    store: Store<BitMapperyState>, activeDocument: Document, props: Pick<DocumentMeta, "bgColor">
): Promise<void> => {
    const orgBgColor = activeDocument.meta.bgColor;
    const isTimeline = activeDocument.type === "timeline";

    const update = ( color?: string ): void => {
        if ( color === TRANSPARENT_COLOR ) {
            color = undefined;
        }
        store.commit( "updateMeta", { bgColor: color });
        getCanvasInstance().setBackgroundColor( color ?? null );
        getCanvasInstance().invalidate();

        if ( isTimeline ) {
            rebuildAllTiles( activeDocument );
        }
    };

    const commit = () => {
        update( props.bgColor );
    };
    commit();

    enqueueState( "bgColor", {
        undo(): void {
            update( orgBgColor );
        },
        redo: commit,
    });
};