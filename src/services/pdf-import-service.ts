/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
import { getDocument } from "pdfjs-dist"; // provides pdfjsLib onto window
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { Size } from "zcanvas";
import type { Document, Layer } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { createCanvas } from "@/utils/canvas-util";
import { readBufferFromFile } from "@/utils/file-util";

type PDFJSLib = {
    getDocument: ( data: ArrayBuffer ) => {
        promise: Promise<PDFDocument>
    };
    GlobalWorkerOptions: {
        workerSrc: string; // assign to Worker URL at runtime
    },
};

type PDFDocument = {
    numPages: number;
    getPage: ( pageNumber: number ) => Promise<PDFPage>;
};

type PDFPage = {
    getViewport: ({ scale }: { scale: number }) => Size;
    render: ({ canvasContext, viewport }: { canvasContext: CanvasRenderingContext2D, viewport: Size }) => {
        promise: Promise<void>
    };
};

let initialized = false;

export const importPDF = async ( pdfFileReference: File ): Promise<Document> => {
    if ( !initialized ) {
        // @ts-expect-error Element implicitly has an 'any' type because type 'typeof globalThis' has no index signature.
        const pdfjsLib: PDFJSLib = globalThis.pdfjsLib; // provided by import of pdfjs-dist above
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        initialized = true;
    }
    const data = await readBufferFromFile( pdfFileReference );
    const pdf  = await getDocument( data ).promise;

    const numPages = pdf.numPages;
    const layers: Layer[] = [];

    let width = 0;
    let height = 0;

    for ( let i = 1; i <= numPages; ++i ) {
        const page = await pdf.getPage( i );
        const viewport = page.getViewport({ scale: 1 });
        const { cvs, ctx } = createCanvas( viewport.width, viewport.height );

        await page.render({ canvasContext: ctx, viewport }).promise;

        layers.push( LayerFactory.create({
            name: `Page ${i}`,
            width: viewport.width,
            height: viewport.height,
            source: cvs
        }));

        width = Math.max( width, viewport.width );
        height = Math.max( height, viewport.height );
    }

    return DocumentFactory.create({
        name: pdfFileReference.name,
        width,
        height,
        layers: layers.reverse()
    });
};
