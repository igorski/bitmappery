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
import GraphicFactory  from "@/factories/graphic-factory";
import { flushSpritesInLayer } from "@/utils/canvas-util";

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
        addNewDocument( state, name ) {
            state.documents.push( DocumentFactory.create( name ));
            state.activeIndex = state.documents.length - 1;
        },
        closeActiveDocument( state ) {
            const document = state.documents[ state.activeIndex ];
            if ( !document ) {
                return;
            }
            // free allocated resources
            document.layers.forEach( layer => flushSpritesInLayer( layer ));
            Vue.delete( state.documents, state.activeIndex );
            state.activeIndex = Math.min( state.documents.length - 1, state.activeIndex );
        },
        addLayer( state, optName ) {
            const layers = state.documents[ state.activeIndex ].layers;
            layers.unshift( LayerFactory.create( optName ) );
            state.activeLayerIndex = 0;
        },
        removeLayer( state, layer ) {
            const index = state.documents[ state.activeIndex ]?.layers.indexOf( layer );
            if ( index < 0 ) {
                return;
            }
            flushSpritesInLayer( layer );
            Vue.delete( state.documents[ state.activeIndex ].layers, index );
        },
        setActiveLayerIndex( state, index ) {
            state.activeLayerIndex = index;
        },
        addGraphicToLayer( state, { index, bitmap, size = {} }) {
            state.documents[ state.activeIndex ].layers[ index ]?.graphics.push(
                GraphicFactory.create( bitmap, 0, 0, size.width, size.height )
            );
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
