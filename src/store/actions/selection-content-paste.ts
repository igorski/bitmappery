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
import type { CopiedImage, CopiedLayer } from "@/definitions/editor";
import { LayerTypes } from "@/definitions/layer-types";
import { enqueueState } from "@/factories/history-state-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { cloneCanvas } from "@/utils/canvas-util";

export const pasteSelectionContent = ( store: Store<BitMapperyState> ): void => {
    const { commit, dispatch, getters, state } = store;
console.info(state);
    const selection = state.selection.selectionContent;
    const insertIndex = getters.activeLayerIndex + 1;

    switch ( selection.type ) {
        default:
            return;
        
        case "layer":
            const layers = selection.content as CopiedLayer;
            const layerIndices = layers.map(( _layer: Layer, i: number ) => {
                return insertIndex + i;
            });
            const pasteLayers = () => {
                for ( let i = 0; i < layers.length; ++i ) {
                    console.info("pasting layer " + i, layers[i], layerIndices[ i ]);
                    commit( "insertLayerAtIndex", { index: layerIndices[ i ], layer: layers[ i ] });
                }
            };
            console.info("pastaaa",layers);
            pasteLayers();
            enqueueState( `paste_${selection.type}_${layers.length}`, {
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
            const { bitmap, type } = selection.content as CopiedImage;
            console.info(selection);
            const layer = LayerFactory.create({
                type: ( !type || type === LayerTypes.LAYER_TEXT ) ? LayerTypes.LAYER_GRAPHIC : type,
                source: cloneCanvas( bitmap ),
                width: bitmap.width,
                height: bitmap.height,
                left: getters.activeDocument.width  / 2 - bitmap.width  / 2,
                top : getters.activeDocument.height / 2 - bitmap.height / 2,
            });
            const paste = () => {
                commit( "insertLayerAtIndex", { index: insertIndex, layer });
                dispatch( "clearSelection" );
            };
            paste();
            enqueueState( `paste_${type}_${bitmap.width}_${bitmap.height}`, {
                undo() {
                    commit( "setSelectionContent", selection );
                    commit( "removeLayer", insertIndex );
                },
                redo: paste
            });
            break;
    }
};