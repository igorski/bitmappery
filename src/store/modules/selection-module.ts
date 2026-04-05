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
import type { ActionContext, Module } from "vuex";
import type { CopiedImage, CopiedSelection } from "@/definitions/editor";
import { LayerTypes } from "@/definitions/layer-types";
import LayerFactory from "@/factories/layer-factory";
import { enqueueState } from "@/factories/history-state-factory";
import { getRendererForLayer } from "@/factories/renderer-factory";
import { getCanvasInstance } from "@/services/canvas-service";
import { cloneCanvas } from "@/utils/canvas-util";
import { copySelection, deleteSelectionContent } from "@/utils/document-util";
import { replaceLayerSource } from "@/utils/layer-util";

export interface SelectionState {
    selectionContent: CopiedSelection | null; // clipboard content of copied images
};

export const createSelectionState = ( props?: Partial<SelectionState> ): SelectionState => ({
    selectionContent: null,
    ...props,
});

const SelectionModule: Module<SelectionState, any> = {
    state: (): SelectionState => createSelectionState(),
    getters: {
        
    },
    mutations: {
        setSelectionContent( state: SelectionState, content: CopiedSelection ): void {
            state.selectionContent = content;
        },
    },
    actions: {
        async requestSelectionCopy({ commit, getters }: ActionContext<SelectionState, any>, { merged = false, isCut = false }): Promise<void> {
            const selectionContent = await copySelection( getters.activeDocument, getters.activeLayer, merged );
            commit( "setSelectionContent", selectionContent );
            commit( "setActiveTool", { tool: null, activeLayer: getters.activeLayer });
            commit( "showNotification", { message: getters.t( isCut ? "selectionCut" : "selectionCopied" ) });
        },
        async requestSelectionCut({ dispatch }: ActionContext<SelectionState, any> ): Promise<void> {
            await dispatch( "requestSelectionCopy", { merged: false, isCut: true });
            dispatch( "deleteInSelection" );
        },
        clearSelection(): void {
            getCanvasInstance()?.interactionPane.resetSelection();
        },
        invertSelection({ commit, getters }: ActionContext<SelectionState, any> ): void {
            getCanvasInstance()?.interactionPane.invertSelection();
            commit( "showNotification", { message: getters.t( "selectionInverted") });
        },
        pasteSelection({ commit, getters, dispatch, state }: ActionContext<SelectionState, any> ): void {
            const selection = state.selectionContent;

            // @todo move to action maybe?

            switch ( selection.type ) {
                default:
                    return;
                case "layer":
                    console.info( "TODODO LAYER PASTE", selection);
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
                    const index = getters.activeDocument.layers.length;
                    const paste = () => {
                        commit( "insertLayerAtIndex", { index, layer });
                        dispatch( "clearSelection" );
                    };
                    paste();
                    enqueueState( `paste_${type}_${bitmap.width}_${bitmap.height}`, {
                        undo() {
                            commit( "setSelectionContent", selection );
                            commit( "removeLayer", index );
                        },
                        redo: paste
                    });
                    break;
            }
        },
        // @todo technically a problem of the document-module
        async deleteInSelection({ getters }: ActionContext<SelectionState, any> ): Promise<void> {
            const activeLayer = getters.activeLayer;
            if ( !activeLayer || !getters.activeDocument?.activeSelection.length ) {
                return;
            }
            const hasMask       = !!activeLayer.mask && getters.activeLayerMask === activeLayer.mask;
            const orgContent    = cloneCanvas( hasMask ? activeLayer.mask : activeLayer.source );
            const updatedBitmap = deleteSelectionContent( getters.activeDocument, activeLayer );

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
        },
    }
};
export default SelectionModule;
