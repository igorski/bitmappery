/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2026 - https://www.igorski.nl
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
import type { Document } from "@/model/types/document";
import type { Layer } from "@/model/types/layer";
import { DEFAULT_DPI, DEFAULT_UNIT } from "@/definitions/document-presets";
import LayerFactory from "@/model/factories/layer-factory";
import { compress, decompress } from "@/services/compression-service";

let UID_COUNTER = 0;

type DocumentProps = Partial<Document>;

const DocumentFactory = {
    /**
     * Creates a new Document (project which contains
     * all layers and image content)
     */
    create({
        name = "New document", width = 1000, height = 1000, layers = [], selections = {}, type = "default", meta,
    }: DocumentProps = {}): Document {
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
            type,
            meta: {
                dpi: DEFAULT_DPI,
                swatches: [],
                unit: DEFAULT_UNIT,
                ...( meta ?? {} ),
            },
            // only during runtime, will not be serialized
            activeSelection: [],
            invertSelection: false,
            groups: [],
        };
    },

    /**
     * Saving a document instance properties into a simplifie
     * JSON structure for project storage
     */
    serialize( document: Document ): any {
        const layers = document.layers.map( LayerFactory.serialize );
        return {
            n: document.name,
            w: document.width,
            h: document.height,
            l: layers,
            s: { ...document.selections },
            t: document.type,
            m: {
                f: document.meta.fps,
                b: document.meta.bgColor,
                d: document.meta.dpi,
                u: document.meta.unit,
                s: [ ...document.meta.swatches ],
                e: document.meta.export ? {
                    m: document.meta.export.mime,
                    q: document.meta.export.quality,
                    t: document.meta.export.type,
                    c: document.meta.export.sheetCols,
                } : undefined,
            },
        };
    },

     /**
      * Creating a new document instance from a stored JSON structure
      */
    async deserialize( serialized: any ): Promise<Document> {
        const layers: Layer[] = [];
        for ( let i = 0, l = ( serialized.l ?? [] ).length; i < l; ++i ) {
            layers.push( await LayerFactory.deserialize( serialized.l[ i ]));
        }
        return DocumentFactory.create({
            name: serialized.n,
            width: serialized.w,
            height: serialized.h,
            layers,
            selections: serialized.s,
            type: serialized.t,
            meta: {
                fps: serialized.m?.f,
                bgColor: serialized.m?.b,
                dpi: serialized.m?.d ?? DEFAULT_DPI,
                unit: serialized.m?.u ?? DEFAULT_UNIT,
                swatches: [ ...( serialized.m?.s ?? []) ],
                export: serialized.m?.e ? {
                    mime: serialized.m.e.m,
                    quality: serialized.m.e.q,
                    type: serialized.m.e.t,
                    sheetCols: serialized.m.e.c,
                } : undefined,
            },
        });
    },

    async toBlob( document: Document ): Promise<Blob> {
        const data = DocumentFactory.serialize( document );
        const blob = await compress( data );
        return blob;
    },

    async fromBlob( blob: Blob ): Promise<Document> {
        const data     = await decompress( blob );
        const document = await DocumentFactory.deserialize( data );
        return document;
    }
};
export default DocumentFactory;
