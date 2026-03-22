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
import type { Document, Layer } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import { type BitMapperyState } from "@/store";
import { getLayersByTile, getIndexOfLastLayerInTileGroup } from "@/utils/timeline-util";
import { cloneLayer } from "@/utils/layer-util";

export const cloneTile = ( store: Store<BitMapperyState>, activeDocument: Document, tile: number ): void => {
    const layers = getLayersByTile( activeDocument, tile );
    const currentlyActiveGroup = store.getters.activeGroup;
    const currentTileAmount = activeDocument.groups.length;
    const nextTile = tile + 1;

    // clone the layers of the current tile
    
    const clonedLayers = layers.map( layer => {
        const clone = cloneLayer( layer );
        clone.rel.id = nextTile;

        return clone;
    });
    const insertIndex = getIndexOfLastLayerInTileGroup( activeDocument, tile ) + 1;

    // in case the next tile (and subsequent ones) already exist, gather them so we can increment their tile offset

    const shiftingGroups = new Map<number, string[]>(); // key == tile id, value is layer ids

    let tileIndex = nextTile;
    
    while ( tileIndex < currentTileAmount ) {
        const nextLayers = getLayersByTile( activeDocument, tileIndex );
        if ( nextLayers.length > 0 ) {
            shiftingGroups.set( tileIndex, nextLayers.map( layer => layer.id ));
        }
        ++tileIndex;
    }

    const commit = (): void => {
        clonedLayers.forEach(( layer: Layer, index: number ) => {
            store.commit( "insertLayerAtIndex", { index: insertIndex + index, layer });
        });

        // increment the tile indices of all layers after the inserted set
        for ( const [ tileIndex, layerIds ] of shiftingGroups ) {
            for ( const layerId of layerIds ) {
                store.commit( "updateLayer", {
                    index: activeDocument.layers.findIndex( layer => layer.id === layerId ),
                    opts: {
                        rel: {
                            type: "tile",
                            id: tileIndex + 1,
                        }
                    }
                });
            }
        }
        store.commit( "setActiveGroup", nextTile );
    };
    commit();

    enqueueState( `tileClone_${tile}`, {
        undo(): void {
            clonedLayers.forEach( layer => {
                const index = activeDocument.layers.findIndex( compare => compare.id === layer.id );
                store.commit( "removeLayer", index );
            });

            // restore the tile indices of all layers after the previously inserted set
            for ( const [ tileIndex, layerIds ] of shiftingGroups ) {
                for ( const layerId of layerIds ) {
                    store.commit( "updateLayer", {
                        index: activeDocument.layers.findIndex( layer => layer.id === layerId ),
                        opts: {
                            rel: {
                                type: "tile",
                                id: tileIndex,
                            }
                        }
                    });
                }
            }
            store.commit( "setActiveGroup", currentlyActiveGroup );
        },
        redo: commit,
    });
};