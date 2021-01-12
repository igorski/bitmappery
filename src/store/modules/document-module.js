/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
    },
    mutations: {
        setActiveDocument( state, index ) {
            state.activeIndex = index;
            runSpriteFn( sprite => sprite.invalidate(), state.documents[ index ] );
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
            layers.push( LayerFactory.create( opts ));
            state.activeLayerIndex = layers.length - 1;
        },
        insertLayerAtIndex( state, { index, layer }) {
            const document = state.documents[ state.activeIndex ];
            document.layers.splice( index, 0, layer );
            state.activeLayerIndex = index;
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
            const layer = state.documents[ state.activeIndex ]?.layers[ index ];
            if ( !layer ) {
                return;
            }
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
        async resizeActiveDocumentContent( state, { scaleX, scaleY }) {
            const document = state.documents[ state.activeIndex ];
            for ( let i = 0, l = document?.layers?.length; i < l; ++i ) {
                const layer = document.layers[ i ];
                // by toggling visiblity we force the Sprite to recache its contents when visible again
                const wasVisible = layer.visible;
                layer.visible = false;
                await resizeLayerContent( layer, scaleX, scaleY );
                layer.visible = wasVisible;
            }
        },
        async cropActiveDocumentContent( state, { left, top }) {
            const document = state.documents[ state.activeIndex ];
            for ( let i = 0, l = document?.layers?.length; i < l; ++i ) {
                const layer = document.layers[ i ];
                // by toggling visiblity we force the Sprite to recache its contents when visible again
                const wasVisible = layer.visible;
                layer.visible = false;
                await cropLayerContent( layer, left, top );
                layer.visible = wasVisible;
            }
        },
        saveSelection( state, { name, selection }) {
            const document = state.documents[ state.activeIndex ];
            Vue.set( document.selections, name, selection );
        },
    },
    actions: {
        requestDocumentClose({ commit, getters }) {
            if ( !getters.activeDocument ) {
                return;
            }
            commit( "openDialog", {
                type    : "confirm",
                title   : getters.t( "areYouSure" ),
                message : getters.t( "closeDocumentWarning", { document: getters.activeDocument.name } ),
                confirm : () => commit( "closeActiveDocument" ),
                cancel  : () => true
            });
        },
    }
}
