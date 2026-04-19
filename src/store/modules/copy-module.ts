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
import type { Layer } from "@/model/types/layer";
import type { CopiedSelection } from "@/definitions/editor";
import { deleteSelection } from "@/model/actions/selection-delete";
import { copySelection } from "@/utils/document-util";
import { cloneLayer } from "@/utils/layer-util";

export interface CopyState {
    copyContent: CopiedSelection | null; // clipboard content of copied images
};

export const createCopyState = ( props?: Partial<CopyState> ): CopyState => ({
    copyContent: null,
    ...props,
});

const CopyModule: Module<CopyState, any> = {
    state: (): CopyState => createCopyState(),
    getters: {
        hasCopiedContent: ( state: CopyState ): boolean => !!state.copyContent,
    },
    mutations: {
        setCopiedContent( state: CopyState, content: CopiedSelection ): void {
            state.copyContent = content;
        },
    },
    actions: {
        async requestSelectionCopy({ commit, getters }: ActionContext<CopyState, any>, { merged = false, isCut = false }): Promise<void> {
            const copyContent = await copySelection( getters.activeDocument, getters.activeLayer, merged );
            commit( "setCopiedContent", copyContent );
            commit( "setActiveTool", { tool: null, activeLayer: getters.activeLayer });
            commit( "showNotification", { message: getters.t( isCut ? "selectionCut" : "selectionCopied" ) });
        },
        async requestSelectionCut( context: ActionContext<CopyState, any> ): Promise<void> {
            await context.dispatch( "requestSelectionCopy", { merged: false, isCut: true });
            deleteSelection( context );
        },
        requestLayerCopy({ commit }: ActionContext<CopyState, any>, layers: Layer[] ): void {
            const clonedLayers = layers.map( layer => cloneLayer( layer ));
            commit( "setCopiedContent", {
                type: "layer",
                content: clonedLayers,
            });
        },
    }
};
export default CopyModule;
