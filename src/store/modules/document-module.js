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

import DocumentFactory from "@/factories/document-factory";
import LayerFactory    from "@/factories/layer-factory";
import { flushLayerSprites, runSpriteFn, getSpriteForLayer, getCanvasInstance } from "@/factories/sprite-factory";
import { resizeLayerContent, cropLayerContent } from "@/utils/render-util";

export default {
    state: {
        documents : [], // opened documents
        activeIndex: 0, // the currently active document
        activeLayerIndex: 0, // the currently active layer within the currently active document
        maskActive: false,
    },
    getters: {
        documents: state => state.documents,
        activeDocument: state => state.documents[ state.activeIndex ],
        layers: ( state, getters ) => getters.activeDocument?.layers,
        activeLayerIndex: state => state.activeLayerIndex,
        activeLayer: ( state, getters ) => getters.layers?.[ state.activeLayerIndex ],
        activeLayerMask: ( state, getters ) => ( state.maskActive && getters.activeLayer.mask ) || null,
        activeLayerEffects: ( state, getters ) => getters.activeLayer?.effects || [],
        hasSelection: ( state, getters ) => getters.activeDocument?.selection?.length > 0,
    },
    mutations: {
        setActiveDocument( state, index ) {
            state.activeIndex = index;
            const document = state.documents[ index ];
            if ( state.activeLayerIndex >=  document?.layers?.length ) {
                state.activeLayerIndex = document.layers.length - 1;
            }
            runSpriteFn( sprite => sprite.invalidate(), document );
        },
        setActiveDocumentName( state, name ) {
            state.documents[ state.activeIndex ].name = name;
        },
        setActiveDocumentSize( state, { width, height }) {
            const document = state.documents[ state.activeIndex ];
            document.width  = width;
            document.height = height;
            getCanvasInstance()?.setDimensions( width, height, true, true );
            getCanvasInstance()?.rescaleFn();
            getCanvasInstance()?.refreshFn();
        },
        setRuntimeSelection( state, selection ) {
            Vue.set( state.documents[ state.activeIndex ], "selection", selection );
        },
        addNewDocument( state, nameOrDocument ) {
            const document = typeof nameOrDocument === "object" ? nameOrDocument : DocumentFactory.create({ name: nameOrDocument });
            state.documents.push( document );
            state.activeIndex      = state.documents.length - 1;
            state.activeLayerIndex = document.layers.length - 1;
        },
        closeActiveDocument( state ) {
            const document = state.documents[ state.activeIndex ];
            if ( !document ) {
                return;
            }
            // free allocated resources
            document.layers.forEach( layer => flushLayerSprites( layer ));
            Vue.delete( state.documents, state.activeIndex );
            state.activeIndex = Math.min( state.documents.length - 1, state.activeIndex );
        },
        addLayer( state, opts = {} ) {
            const document = state.documents[ state.activeIndex ];
            const layers   = document.layers;
            if ( typeof opts.width !== "number" ) {
                opts.width  = document.width;
                opts.height = document.height;
            }
            layers.push( opts.id ? opts : LayerFactory.create( opts ));
            state.activeLayerIndex = layers.length - 1;
        },
        insertLayerAtIndex( state, { index, layer }) {
            layer = layer.id ? layer : LayerFactory.create( layer );
            const document = state.documents[ state.activeIndex ];
            document.layers.splice( index, 0, layer );
            state.activeLayerIndex = index;
        },
        swapLayers( state, { index1, index2 } ) {
            const layers = state.documents[ state.activeIndex ].layers;
            const obj1 = layers[ index1 ];
            Vue.set( layers, index1, layers[ index2 ]);
            Vue.set( layers, index2, obj1 );
        },
        reorderLayers( state, { document, layerIds }) {
            const oldLayers = [ ...document.layers ];
            document.layers.splice( 0, oldLayers.length );
            layerIds.forEach( id => {
                document.layers.push( oldLayers.find( layer => layer.id === id));
            });
        },
        removeLayer( state, index ) {
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
        setActiveLayerIndex( state, layerIndex ) {
            state.activeLayerIndex = layerIndex;
            state.maskActive = false;
        },
        setActiveLayer( state, layer ) {
            const index = state.documents[ state.activeIndex ]?.layers.indexOf( layer );
            if ( index > -1 ) {
                state.activeLayerIndex = index;
            }
        },
        setActiveLayerMask( state, layerIndex ) {
            state.activeLayerIndex = layerIndex;
            state.maskActive = !!state.documents[ state.activeIndex ]?.layers[ layerIndex ]?.mask;
        },
        updateLayer( state, { index, opts = {} }) {
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
        updateLayerEffects( state, { index, effects = {} }) {
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
        async resizeActiveDocumentContent( state, { scaleX, scaleY }) {
            const document = state.documents[ state.activeIndex ];
            for ( const layer of document?.layers ?? [] ) {
                await resizeLayerContent( layer, scaleX, scaleY );
            }
        },
        async cropActiveDocumentContent( state, { left, top }) {
            const document = state.documents[ state.activeIndex ];
            for ( const layer of document?.layers ) {
                await cropLayerContent( layer, left, top );
                getSpriteForLayer( layer )?.syncPosition();
            }
        },
        saveSelection( state, { name, selection }) {
            const document = state.documents[ state.activeIndex ];
            Vue.set( document.selections, name, selection );
        },
    },
    actions: {
        requestDocumentClose({ state, commit, getters }) {
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
                cancel  : () => true
            });
        },
    }
}
