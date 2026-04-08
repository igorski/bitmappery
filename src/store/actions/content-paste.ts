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
import type { Layer } from "@/definitions/document";
import type { CopiedImage, CopiedLayers } from "@/definitions/editor";
import { LayerTypes } from "@/definitions/layer-types";
import { enqueueState } from "@/factories/history-state-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { cloneCanvas } from "@/utils/canvas-util";
import { getIndexOfLastLayerInTileGroup } from "@/utils/timeline-util";

export const pasteCopiedContent = ( store: Store<BitMapperyState> ): void => {
    const { commit, dispatch, getters, state } = store;

    const { activeDocument, activeGroup } = getters;
    const isTimeline = activeDocument.type === "timeline";
    const insertIndex = ( isTimeline ? getIndexOfLastLayerInTileGroup( activeDocument, activeGroup ) : getters.activeLayerIndex ) + 1;
    const { copyContent } = state.copy;

    switch ( copyContent.type ) {
        default:
            return;
        
        case "layer":
            const layers = copyContent.content as CopiedLayers;
            const layerIndices = layers.map(( _layer: Layer, i: number ) => {
                return insertIndex + i;
            });
            const pasteLayers = () => {
                for ( let i = 0; i < layers.length; ++i ) {
                    commit( "insertLayerAtIndex", { index: layerIndices[ i ], layer: wrapLayer( layers[ i ], isTimeline, activeGroup ) });
                }
            };
            pasteLayers();
            enqueueState( `paste_${copyContent.type}_${layers.length}`, {
                undo() {
                    let i = layerIndices.length;
                    while ( i-- ) {
                        commit( "removeLayer", layerIndices[ i ]);
                    }
                },
                redo: pasteLayers
            });
            break;
        
        case "image":
            const { bitmap, type } = copyContent.content as CopiedImage;
            
            const layer = wrapLayer(
                LayerFactory.create({
                    type: ( !type || type === LayerTypes.LAYER_TEXT ) ? LayerTypes.LAYER_GRAPHIC : type,
                    source: cloneCanvas( bitmap ),
                    width: bitmap.width,
                    height: bitmap.height,
                    left: getters.activeDocument.width  / 2 - bitmap.width  / 2,
                    top : getters.activeDocument.height / 2 - bitmap.height / 2,  
                }), isTimeline, activeGroup,
            );
            const pasteImage = () => {
                commit( "insertLayerAtIndex", { index: insertIndex, layer });
                dispatch( "clearSelection" );
            };
            pasteImage();
            enqueueState( `paste_${type}_${bitmap.width}_${bitmap.height}`, {
                undo() {
                    commit( "setCopiedContent", copyContent );
                    commit( "removeLayer", insertIndex );
                },
                redo: pasteImage
            });
            break;
    }
};

/* internal methods */

function wrapLayer( layer: Layer, isTimeline: boolean, activeGroup: number ): Layer {
    return {
        ...layer,
        rel : isTimeline ? {
            type: "tile",
            id: activeGroup,
        } : { type: "none" },
    };
}