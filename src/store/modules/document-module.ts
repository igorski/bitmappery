/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
import type { Rectangle, Size } from "zcanvas";
import type { Document, Layer, Transformations, Selection } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { createRendererForLayer, flushLayerRenderers, runRendererFn, getRendererForLayer } from "@/factories/renderer-factory";
import { flushBlendedLayerCache } from "@/rendering/cache/blended-layer-cache";
import { getCanvasInstance } from "@/services/canvas-service";
import { resizeLayerContent, cropLayerContent } from "@/utils/layer-util";

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
        layers: ( state: DocumentState ): Layer[] => {
            return state.documents[ state.activeIndex ]?.layers;
        },
        activeLayerIndex: ( state: DocumentState ): number => {
            return state.activeLayerIndex;
        },
        activeLayer: ( state: DocumentState, getters: any ): Layer => {
            return getters.layers?.[ state.activeLayerIndex ];
        },
        activeLayerMask: ( state: DocumentState, getters: any ): HTMLCanvasElement | undefined => {
            return ( state.maskActive && getters.activeLayer?.mask ) || undefined;
        },
        activeLayerTransformations: ( _state: DocumentState, getters: any ): Transformations => {
            return getters.activeLayer?.transformations || {};
        },
        hasSelection: ( _state: DocumentState, getters: any ): boolean => {
            if ( !getters.activeDocument ) {
                return false;
            }
            return getters.activeDocument.activeSelection[ 0 ]?.length > 0;
        },
    },
    mutations: {
        setActiveDocument( state: DocumentState, index: number ): void {
            state.activeIndex = index;
            const document = state.documents[ index ];
            if ( state.activeLayerIndex >=  document?.layers?.length ) {
                state.activeLayerIndex = document.layers.length - 1;
            }
            runRendererFn( renderer => renderer.invalidate(), document );
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
        setActiveSelection( state: DocumentState, selection: Selection ): void {
            state.documents[ state.activeIndex ].activeSelection = selection;
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
            document.layers.forEach( layer => flushLayerRenderers( layer ));
            state.documents.splice( state.activeIndex, 1 );
            state.activeIndex = Math.min( state.documents.length - 1, state.activeIndex );
        },
        addLayer( state: DocumentState, opts: Partial<Layer> = {} ): void {
            const document = state.documents[ state.activeIndex ];
            const layers   = [ ...document.layers ];
            if ( typeof opts.width !== "number" ) {
                opts.width  = document.width;
                opts.height = document.height;
            }
            layers.push( opts.id ? opts as Layer : LayerFactory.create( opts ));
            document.layers = layers;
            state.activeLayerIndex = layers.length - 1;
        },
        insertLayerAtIndex( state: DocumentState, { index, layer }: { index: number, layer: Layer }): void {
            layer = layer.id ? layer : LayerFactory.create( layer );
            const document = state.documents[ state.activeIndex ];
            const orgLayers = [ ...document.layers ];
            document.layers = [
                ...orgLayers.slice( 0, index ),
                layer,
                ...orgLayers.slice( index ),
            ];
            state.activeLayerIndex = index;
        },
        swapLayers( state: DocumentState, { index1, index2 }: { index1: number, index2: number } ): void {
            const layers = state.documents[ state.activeIndex ].layers;
            const obj1 = layers[ index1 ];
            layers[ index1 ] = layers[ index2 ];
            layers[ index2 ] = obj1;
        },
        reorderLayers( _state: DocumentState, { document, layerIds }: { document: Document, layerIds: string[] }): void {
            const oldLayers = [ ...document.layers ];
            const layers = [ ...document.layers ];
            layers.splice( 0, oldLayers.length );
            layerIds.forEach( id => {
                layers.push( oldLayers.find( layer => layer.id === id ));
            });
            document.layers = layers;
            flushBlendedLayerCache( true );
        },
        removeLayer( state: DocumentState, index: number ): void {
            const layer = state.documents[ state.activeIndex ]?.layers[ index ];
            if ( !layer ) {
                return;
            }
            flushLayerRenderers( layer );
            flushBlendedLayerCache( true );
            state.documents[ state.activeIndex ].layers.splice( index, 1 );
            if ( state.activeLayerIndex === index ) {
                state.activeLayerIndex = Math.max( 0, index - 1 );
            }
        },
        replaceLayers( state: DocumentState, layers: Layer[] ): void {
            const activeDocument = state.documents[ state.activeIndex ];
            if ( activeDocument ) {
                activeDocument.layers = layers;
            }
            if ( state.activeLayerIndex > layers.length ) {
                state.activeLayerIndex = layers.length - 1;
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
        updateLayer( state: DocumentState, { index, opts = {}, recreateRenderer = false }: { index: number, opts: Partial<Layer>, recreateRenderer?: boolean }): void {
            let layer = state.documents[ state.activeIndex ]?.layers[ index ];
            if ( !layer ) {
                return; // likely document unload during async update operation
            }
            layer = {
                ...layer,
                ...opts
            };
            state.documents[ state.activeIndex ].layers[ index ] = layer;
            if ( recreateRenderer ) {
                getCanvasInstance().setLock( true ); // will be unlocked by renderer recache
                flushLayerRenderers( layer );
                createRendererForLayer( getCanvasInstance(), layer, index === state.activeLayerIndex );
                return;
            }
            // update layer in renderer
            const renderer = getRendererForLayer( layer );
            if ( renderer ) {
                renderer.layer = layer;
                const flushBlendCache = !!opts.filters;
                if ( flushBlendCache ) {
                    flushBlendedLayerCache( true ); // direct to prevent rendering errors on undo
                }
                opts.source ? renderer.resetFilterAndRecache() : renderer.cacheEffects();
            }
        },
        updateLayerTransformations( state: DocumentState, { index, transformations = {} }: { index: number, transformations: Partial<Transformations> }): void {
            const layer = state.documents[ state.activeIndex ]?.layers[ index ];
            if ( !layer ) {
                return;
            }
            layer.transformations = {
                ...layer.transformations,
                ...transformations
            };
            // update layer renderer
            const renderer = getRendererForLayer( layer );
            if ( renderer ) {
                renderer.layer = layer;
                renderer.invalidateBlendCache();
            }
        },
        async resizeActiveDocumentContent( state: DocumentState, { scaleX, scaleY }: { scaleX: number, scaleY: number }): Promise<void> {
            const document = state.documents[ state.activeIndex ];
            for ( const layer of document?.layers ?? [] ) {
                await resizeLayerContent( layer, scaleX, scaleY );
            }
        },
        async cropActiveDocumentContent( state: DocumentState, cropRectangle: Rectangle ): Promise<void> {
            const document = state.documents[ state.activeIndex ];
            if ( !document ) {
                return;
            }
            for ( const layer of document.layers ) {
                await cropLayerContent( layer, cropRectangle );
                getRendererForLayer( layer )?.syncPosition();
            }
        },
        saveSelection( state: DocumentState, { name, selection }: { name: string, selection: Selection }): void {
            const document = state.documents[ state.activeIndex ];
            document.selections[ name ] = selection;
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
