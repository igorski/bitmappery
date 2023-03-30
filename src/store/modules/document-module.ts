/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
import Vue from "vue";
import type { ActionContext, Module } from "vuex";
import type { Size } from "zcanvas";
import type { Document, Layer, Effects, Selection } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { flushLayerSprites, runSpriteFn, getSpriteForLayer, getCanvasInstance } from "@/factories/sprite-factory";
import { resizeLayerContent, cropLayerContent } from "@/utils/render-util";

export interface DocumentState {
    documents : Document[]; // opened documents
    activeIndex: number; // the currently active document
    activeLayerIndex: number; // the currently active layer within the currently active document
    maskActive: boolean;
};

export const createDocumentState = ( props?: Partial<DocumentState> ): DocumentState => ({
    documents : [],
    activeIndex: 0,
    activeLayerIndex: 0,
    maskActive: false,
    ...props,
});

const DocumentModule: Module<DocumentState, any> = {
    state: (): DocumentState => createDocumentState(),
    getters: {
        documents: ( state: DocumentState ): Document[] => {
            return state.documents;
        },
        activeDocument: ( state: DocumentState ): Document => {
            return state.documents[ state.activeIndex ];
        },
        // @ts-expect-error state is declared but never read
        layers: ( state: DocumentState, getters: any ): Layer[] => {
            return getters.activeDocument?.layers;
        },
        activeLayerIndex: ( state: DocumentState ): number => {
            return state.activeLayerIndex;
        },
        activeLayer: ( state: DocumentState, getters: any ): Layer => {
            return getters.layers?.[ state.activeLayerIndex ];
        },
        activeLayerMask: ( state: DocumentState, getters: any ): HTMLCanvasElement | null => {
            return ( state.maskActive && getters.activeLayer.mask ) || null;
        },
        // @ts-expect-error state is declared but never read
        activeLayerEffects: ( state: DocumentState, getters: any ): Effects => {
            return getters.activeLayer?.effects || {};
        },
        // @ts-expect-error state is declared but never read
        hasSelection: ( state: DocumentState, getters: any ): boolean => {
            return getters.activeDocument?.selection?.length > 0;
        },
    },
    mutations: {
        setActiveDocument( state: DocumentState, index: number ): void {
            state.activeIndex = index;
            const document = state.documents[ index ];
            if ( state.activeLayerIndex >=  document?.layers?.length ) {
                state.activeLayerIndex = document.layers.length - 1;
            }
            runSpriteFn( sprite => sprite.invalidate(), document );
        },
        setActiveDocumentName( state: DocumentState, name: string ): void {
            state.documents[ state.activeIndex ].name = name;
        },
        setActiveDocumentSize( state: DocumentState, { width, height }: Size ): void {
            const document = state.documents[ state.activeIndex ];
            document.width  = width;
            document.height = height;
            getCanvasInstance()?.setDimensions( width, height, true, true );
            getCanvasInstance()?.rescaleFn();
            getCanvasInstance()?.refreshFn();
        },
        setRuntimeSelection( state: DocumentState, selection: Selection ): void {
            Vue.set( state.documents[ state.activeIndex ], "selection", selection );
        },
        addNewDocument( state: DocumentState, nameOrDocument: string | Document ): void {
            const document = typeof nameOrDocument === "object" ? nameOrDocument : DocumentFactory.create({ name: nameOrDocument });
            state.documents.push( document );
            state.activeIndex = state.documents.length - 1;
            state.activeLayerIndex = document.layers.length - 1;
        },
        closeActiveDocument( state: DocumentState ): void {
            const document = state.documents[ state.activeIndex ];
            if ( !document ) {
                return;
            }
            // free allocated resources
            document.layers.forEach( layer => flushLayerSprites( layer ));
            Vue.delete( state.documents, state.activeIndex );
            state.activeIndex = Math.min( state.documents.length - 1, state.activeIndex );
        },
        addLayer( state: DocumentState, opts: Partial<Layer> = {} ): void {
            const document = state.documents[ state.activeIndex ];
            const layers   = document.layers;
            if ( typeof opts.width !== "number" ) {
                opts.width  = document.width;
                opts.height = document.height;
            }
            layers.push( opts.id ? opts as Layer : LayerFactory.create( opts ));
            state.activeLayerIndex = layers.length - 1;
        },
        insertLayerAtIndex( state: DocumentState, { index, layer }: { index: number, layer: Layer }): void {
            layer = layer.id ? layer : LayerFactory.create( layer );
            const document = state.documents[ state.activeIndex ];
            document.layers.splice( index, 0, layer );
            state.activeLayerIndex = index;
        },
        swapLayers( state: DocumentState, { index1, index2 }: { index1: number, index2: number } ): void {
            const layers = state.documents[ state.activeIndex ].layers;
            const obj1 = layers[ index1 ];
            Vue.set( layers, index1, layers[ index2 ]);
            Vue.set( layers, index2, obj1 );
        },
        // @ts-expect-error state is declared but never read
        reorderLayers( state: DocumentState, { document, layerIds }: { document: Document, layerIds: string[] }): void {
            const oldLayers = [ ...document.layers ];
            document.layers.splice( 0, oldLayers.length );
            layerIds.forEach( id => {
                document.layers.push( oldLayers.find( layer => layer.id === id));
            });
        },
        removeLayer( state: DocumentState, index: number ): void {
            const layer = state.documents[ state.activeIndex ]?.layers[ index ];
            if ( !layer ) {
                return;
            }
            flushLayerSprites( layer );
            Vue.delete( state.documents[ state.activeIndex ].layers, index );
            if ( state.activeLayerIndex === index ) {
                state.activeLayerIndex = Math.max( 0, index - 1 );
            }
        },
        setActiveLayerIndex( state: DocumentState, layerIndex: number ): void {
            state.activeLayerIndex = layerIndex;
            state.maskActive = false;
        },
        setActiveLayer( state: DocumentState, layer: Layer ): void {
            const index = state.documents[ state.activeIndex ]?.layers.indexOf( layer );
            if ( index > -1 ) {
                state.activeLayerIndex = index;
            }
        },
        setActiveLayerMask( state: DocumentState, layerIndex: number ): void {
            state.activeLayerIndex = layerIndex;
            state.maskActive = !!state.documents[ state.activeIndex ]?.layers[ layerIndex ]?.mask;
        },
        updateLayer( state: DocumentState, { index, opts = {} }: { index: number, opts: Partial<Layer> }): void {
            let layer = state.documents[ state.activeIndex ]?.layers[ index ];
            if ( !layer ) {
                return; // likely document unload during async update operation
            }
            layer = {
                ...layer,
                ...opts
            };
            Vue.set( state.documents[ state.activeIndex ].layers, index, layer );
            // update layer in sprite
            const sprite = getSpriteForLayer( layer );
            if ( sprite ) {
                sprite.layer = layer;
                opts.source ? sprite.resetFilterAndRecache() : sprite.cacheEffects();
            }
        },
        updateLayerEffects( state: DocumentState, { index, effects = {} }: { index: number, effects: Partial<Effects> }): void {
            const layer = state.documents[ state.activeIndex ]?.layers[ index ];
            if ( !layer ) {
                return;
            }
            Vue.set( layer, "effects", {
                ...layer.effects,
                ...effects
            });
            // update layer renderer
            const sprite = getSpriteForLayer( layer );
            if ( sprite ) {
                sprite.layer = layer;
                sprite.invalidate();
            }
        },
        async resizeActiveDocumentContent( state: DocumentState, { scaleX, scaleY }: { scaleX: number, scaleY: number }): Promise<void> {
            const document = state.documents[ state.activeIndex ];
            for ( const layer of document?.layers ?? [] ) {
                await resizeLayerContent( layer, scaleX, scaleY );
            }
        },
        async cropActiveDocumentContent( state: DocumentState, { left, top }: { left: number, top: number }): Promise<void> {
            const document = state.documents[ state.activeIndex ];
            if ( !document ) {
                return;
            }
            for ( const layer of document.layers ) {
                await cropLayerContent( layer, left, top );
                getSpriteForLayer( layer )?.syncPosition();
            }
        },
        saveSelection( state: DocumentState, { name, selection }: { name: string, selection: Selection }): void {
            const document = state.documents[ state.activeIndex ];
            Vue.set( document.selections, name, selection );
        },
    },
    actions: {
        requestDocumentClose({ state, commit, getters }: ActionContext<DocumentState, any> ): void {
            const document = getters.activeDocument;
            if ( !document ) {
                return;
            }
            commit( "openDialog", {
                type    : "confirm",
                title   : getters.t( "areYouSure" ),
                message : getters.t( "closeDocumentWarning", { document: document.name } ),
                confirm : () => {
                    commit( "closeActiveDocument" );
                    commit( "removeImagesForDocument", document );
                    commit( "setActiveDocument", Math.min( state.documents.length - 1, state.activeIndex ));
                },
                cancel : () => true
            });
        },
    }
};
export default DocumentModule;
