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
import pdfLibUrl from "pdfjs-dist/build/pdf.min.js?url";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import loadScript from "tiny-script-loader/loadScriptPromised";
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

let pdfjsLib: PDFJSLib;

export const importPDF = async ( pdfFileReference: File ): Promise<Document> => {
    if ( !pdfjsLib ) {
        await loadScript( pdfLibUrl );
        await loadScript( pdfWorkerUrl );

        // @ts-expect-error  Property 'pdfjsLib' does not exist on type 'Window & typeof globalThis'.
        // but it is injected by the loaded scripts
        pdfjsLib = window.pdfjsLib;
    }
    const data = await readBufferFromFile( pdfFileReference );
    const pdf  = await pdfjsLib.getDocument( data ).promise;

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
