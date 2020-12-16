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
        documents : [],
        activeIndex: 0,
    },
    getters: {
        documents: state => state.documents,
        activeDocument: state => state.documents[ state.activeIndex ],
        layers: ( state, getters ) => getters.activeDocument?.layers,
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
        addLayer( state ) {
            state.documents[ state.activeIndex ].layers.push( LayerFactory.create() );
        },
        addGraphicToLayer( state, { index, bitmap, size = {} }) {
            state.documents[ state.activeIndex ].layers[ index ]?.graphics.push(
                GraphicFactory.create( bitmap, 0, 0, size.width, size.height )
            );
        },
    },
    actions: {
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
