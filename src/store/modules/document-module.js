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
import { flushLayerSprites } from "@/factories/sprite-factory";

export default {
    state: {
        documents : [], // opened documents
        activeIndex: 0, // the currently active document
        activeLayerIndex: 0, // the currently active layer within the currently active document
    },
    getters: {
        documents: state => state.documents,
        activeDocument: state => state.documents[ state.activeIndex ],
        layers: ( state, getters ) => getters.activeDocument?.layers,
        activeLayer: ( state, getters ) => getters.layers?.[ state.activeLayerIndex ],
        activeLayerIndex: state => state.activeLayerIndex,
    },
    mutations: {
        setActiveDocument( state, index ) {
            state.activeIndex = index;
        },
        setActiveDocumentSize( state, { width, height }) {
            const document = state.documents[ state.activeIndex ];
            document.width  = width;
            document.height = height;
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
        removeLayer( state, layer ) {
            const index = state.documents[ state.activeIndex ]?.layers.indexOf( layer );
            if ( index < 0 ) {
                return;
            }
            flushLayerSprites( layer );
            Vue.delete( state.documents[ state.activeIndex ].layers, index );
            if ( state.activeLayerIndex === index ) {
                state.activeLayerIndex = Math.max( 0, index - 1 );
            }
        },
        setActiveLayerIndex( state, index ) {
            state.activeLayerIndex = index;
        },
        updateLayer( state, { index, opts = {} }) {
            const layer = state.documents[ state.activeIndex ].layers[ index ];
            Vue.set( state.documents[ state.activeIndex ].layers, index, {
                ...layer,
                ...opts
            });
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
