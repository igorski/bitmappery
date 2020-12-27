/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
import { flushLayerSprites, runSpriteFn, getSpriteForLayer } from "@/factories/sprite-factory";

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
        activeLayerEffects: ( state, getters ) => getters.activeLayer.effects || [],
    },
    mutations: {
        setActiveDocument( state, index ) {
            state.activeIndex = index;
            runSpriteFn( sprite => sprite.invalidate(), state.documents[ index ] );
        },
        setActiveDocumentSize( state, { width, height }) {
            const document = state.documents[ state.activeIndex ];
            const ratioX   = width  / document.width;
            const ratioY   = height / document.height;
            document.width  = width;
            document.height = height;
            document.layers?.forEach( layer => {
                layer.width  *= ratioX;
                layer.height *= ratioY;
                getSpriteForLayer( layer )?.resize( layer.width, layer.height );
            });
        },
        addNewDocument( state, nameOrDocument ) {
            const document = typeof nameOrDocument === "object" ? nameOrDocument : DocumentFactory.create({ name: nameOrDocument });
            state.documents.push( document );
            state.activeIndex = state.documents.length - 1;
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
        addLayer( state, opts ) {
            const layers = state.documents[ state.activeIndex ].layers;
            layers.push( LayerFactory.create( opts ) );
            state.activeLayerIndex = layers.length - 1;
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
        setActiveLayerMask( state, layerIndex ) {
            state.activeLayerIndex = layerIndex;
            state.maskActive = !!state.documents[ state.activeIndex ].layers[ layerIndex ].mask;
        },
        updateLayer( state, { index, opts = {} }) {
            let layer = state.documents[ state.activeIndex ].layers[ index ];
            layer = {
                ...layer,
                ...opts
            };
            Vue.set( state.documents[ state.activeIndex ].layers, index, layer );
            // update layer in sprite
            const sprite = getSpriteForLayer( layer );
            if ( sprite ) {
                sprite.layer = layer;
                sprite.cacheEffects();
            }
        },
        updateLayerEffects( state, { index, effects = {} }) {
            const layer = state.documents[ state.activeIndex ].layers[ index ];
            Vue.set( layer, "effects", {
                ...layer.effects,
                ...effects
            });
            // update layer in sprite
            const sprite = getSpriteForLayer( layer );
            if ( sprite ) {
                sprite.layer = layer;
                sprite.cacheEffects();
            }
        },
    },
    actions: {
        requestNewDocument({ commit, getters }) {
            commit( "addNewDocument", getters.t( "newDocumentNum", { num: getters.documents.length + 1 }));
        },
        requestDocumentClose({ commit, getters }) {
            commit( "openDialog", {
                type: "confirm",
                title: getters.t( "areYouSure" ),
                message: getters.t( "closeDocumentWarning" ),
                confirm: () => commit( "closeActiveDocument" ),
                cancel: () => true
            });
        },
    }
}
