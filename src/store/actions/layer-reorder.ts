/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2026 - https://www.igorski.nl
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
import type { Document, RelId } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import { createGroupTile } from "@/rendering/cache/tile-cache";
import { type BitMapperyState } from "@/store";
import { getTileByLayer } from "@/utils/timeline-util";

/**
 * layerIds represents an ordered list
 */
export const reorderLayers = ( store: Store<BitMapperyState>, activeDocument: Document, layerIds: string[] ): void => {
    // provided layerIds can be a subset of all of the documents layers (for instance
    // when rearranging inside a group/animation tile), so we must relate these
    // to the full Layer structure

    const originalOrder = activeDocument.layers.map( layer => layer.id );
    const updatedOrder  = [ ...originalOrder ];
    const subsetIndices = originalOrder.reduce(( acc: number[], layerId: string, idx: number ) => {
        if ( layerIds.includes( layerId )) {
            acc.push( idx );
        }
        return acc;
    }, []);

    subsetIndices.forEach(( idx: number, i: number ) => {
        updatedOrder[ idx ] = layerIds[ i ];
    });

    const tileIds = activeDocument.type === "timeline" ? [ ...layerIds.reduce(( acc, layerId ) => {
        acc.add( getTileByLayer( activeDocument, layerId ));
        return acc;
    }, new Set<RelId>())] : [];

    const commit = () => {
        store.commit( "reorderLayers", { activeDocument, layerIds: updatedOrder } );
        tileIds.forEach( tileId => createGroupTile( tileId, activeDocument ));
    };
    commit();
    
    enqueueState( `reorderLayers_${layerIds.join()}`, {
        undo(): void {
            store.commit( "reorderLayers", { activeDocument, layerIds: originalOrder });
            tileIds.forEach( tileId => createGroupTile( tileId, activeDocument ));
        },
        redo: commit,
    });
};