/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022-2025 - https://www.igorski.nl
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
import { type Document } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { resizeImage } from "@/utils/canvas-util";
import { createSyncSnapshot, sliceTiles } from "@/utils/document-util";

export const sliceGridToLayers = async (
    store: Store<BitMapperyState>, activeDocument: Document, tileWidth: number, tileHeight: number, allVisible: boolean, sliceName: string
): Promise<void> => {
    // collect existing layers
    const originalLayers = [ ...activeDocument.layers ];
    const originalWidth  = activeDocument.width;
    const originalHeight = activeDocument.height;

    // flatten document
    // also keep in mind zCanvas magnifies content by the pixel ratio for a crisper result
    // downscale to actual dimensions of the document
    const flattenedLayer = await resizeImage( createSyncSnapshot( activeDocument ), originalWidth, originalHeight );

    // create layers from slices created from the flattened document
    const slicedTiles  = await sliceTiles( flattenedLayer, tileWidth, tileHeight );

    const slicedLayers = slicedTiles.map(( bitmap, index ) => {
        return LayerFactory.create({
            name    : `${sliceName} #${index + 1}`,
            source  : bitmap,
            visible : allVisible ? true : index === slicedTiles.length - 1,
            width   : tileWidth,
            height  : tileHeight,
        });
    });

    // commit changes, add to state history
    const commit = async (): Promise<void> => {
        store.commit( "replaceLayers", slicedLayers );
        store.commit( "setActiveDocumentSize", { width: tileWidth, height: tileHeight });
    };
    commit();
    
    enqueueState( "slice-to-layers", {
        undo(): void {
            store.commit( "replaceLayers", originalLayers );
            store.commit( "setActiveDocumentSize", { width: originalWidth, height: originalHeight });
        },
        redo: commit,
    });
};
