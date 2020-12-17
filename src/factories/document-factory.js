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
let UID_COUNTER = 0;

import LayerFactory from "@/factories/layer-factory";

const DocumentFactory = {
    /**
     * Creates a new Document (project which contains
     * all layers and image content)
     */
    create({
        name = "New document", width = 400, height = 300, layers = []
    } = {}) {
        if ( !layers.length ) {
            layers = [ LayerFactory.create({ width, height }) ];
        }
        return {
            id: `doc_${( ++UID_COUNTER )}`,
            layers,
            name,
            width,
            height,
        };
    },

    /**
     * Saving a document instance properties into a simplifie
     * JSON structure for project storage
     */
    save( document ) {
        const layers = document.layers.map( LayerFactory.save );
        return {
            n: document.name,
            w: document.width,
            h: document.height,
            l: layers
        };
    },

     /**
      * Creating a new document instance from a stored JSON structure
      */
    async load( document ) {
        const layers = [];
        for ( let i = 0, l = ( document.l ?? [] ).length; i < l; ++i ) {
            layers.push( await LayerFactory.load( document.l[ i ]));
        }
        return DocumentFactory.create({
            name: document.n,
            width: document.w,
            height: document.h,
            layers
        });
    }
};
export default DocumentFactory;
