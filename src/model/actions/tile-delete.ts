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
import type { Document } from "@/model/types/document";
import type { Layer } from "@/model/types/layer";
import { enqueueState } from "@/model/factories/history-state-factory";
import { flushTileCache, rebuildAllTiles } from "@/rendering/cache/tile-cache";
import { type BitMapperyState } from "@/store";
import { getLayersByTile, getIndexOfFirstLayerInTileGroup } from "@/utils/timeline-util";

export const deleteTile = ( store: Store<BitMapperyState>, activeDocument: Document, tile: number ): void => {
    const layers = getLayersByTile( activeDocument, tile );
    const currentlyActiveGroup = store.getters.activeGroup;
    const currentTileAmount = activeDocument.groups.length;

    // clone the layers of the current tile
    
    const layerIndex = getIndexOfFirstLayerInTileGroup( activeDocument, tile );

    // in case the next tile (and subsequent ones) already exist, gather them so we can decrement their tile offset

    const shiftingGroups = new Map<number, string[]>(); // key == tile id, value is layer ids

    let tileIndex = tile;
    
    while ( ++tileIndex < currentTileAmount ) {
        const prevLayers = getLayersByTile( activeDocument, tileIndex );
        if ( prevLayers.length > 0 ) {
            shiftingGroups.set( tileIndex, prevLayers.map( layer => layer.id ));
        }
    }

    const updateTileCache = (): void => {
        flushTileCache();
        queueMicrotask(() => {
            rebuildAllTiles( activeDocument );
        });
    };

    const commit = (): void => {
        layers.forEach( layer => {
            store.commit( "removeLayer", activeDocument.layers.findIndex( compare => compare.id === layer.id ));
        });

        // decrement the tile indices of all layers after the remove set
        for ( const [ tileIndex, layerIds ] of shiftingGroups ) {
            for ( const layerId of layerIds ) {
                store.commit( "updateLayer", {
                    index: activeDocument.layers.findIndex( layer => layer.id === layerId ),
                    opts: {
                        rel: {
                            type: "tile",
                            id: tileIndex - 1,
                        }
                    }
                });
            }
        }
        if ( currentlyActiveGroup === tile ) {
            store.commit( "setActiveGroup", Math.max( 0, tile - 1 ));
        }
        updateTileCache();
    };
    commit();

    enqueueState( `tileDelete_${tile}`, {
        undo(): void {
            layers.forEach(( layer: Layer, index: number ) => {
                store.commit( "insertLayerAtIndex", { index: layerIndex + index, layer });
            });

            // restore the tile indices of all layers after the inserted set
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
            if ( currentlyActiveGroup === tile ) {
                store.commit( "setActiveGroup", currentlyActiveGroup );
            }
            updateTileCache();
        },
        redo: commit,
    });
};