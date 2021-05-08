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
import LayerFactory from "@/factories/layer-factory";
import { compress, decompress } from "@/services/compression-service";

let UID_COUNTER = 0;

const DocumentFactory = {
    /**
     * Creates a new Document (project which contains
     * all layers and image content)
     */
    create({
        name = "New document", width = 1000, height = 1000, layers = [], selections = {}
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
            selections,
            // only used at runtime, will not be serialized
            selection: null,
            invertSelection: false,
        };
    },

    /**
     * Saving a document instance properties into a simplifie
     * JSON structure for project storage
     */
    serialize( document ) {
        const layers = document.layers.map( LayerFactory.serialize );
        return {
            n: document.name,
            w: document.width,
            h: document.height,
            l: layers,
            s: document.selections,
        };
    },

     /**
      * Creating a new document instance from a stored JSON structure
      */
    async deserialize( document ) {
        const layers = [];
        for ( let i = 0, l = ( document.l ?? [] ).length; i < l; ++i ) {
            layers.push( await LayerFactory.deserialize( document.l[ i ]));
        }
        return DocumentFactory.create({
            name: document.n,
            width: document.w,
            height: document.h,
            layers,
            selections: document.s,
        });
    },

    async toBlob( document ) {
        const data = DocumentFactory.serialize( document );
        const blob = await compress( data );
        return blob;
    },

    async fromBlob( blob ) {
        const data     = await decompress( blob );
        const document = await DocumentFactory.deserialize( data );
        return document;
    }
};
export default DocumentFactory;
