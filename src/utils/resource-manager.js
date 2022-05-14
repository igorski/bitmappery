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
import { canvasToBlob } from "@/utils/canvas-util";

/**
 * Creates a Blob URL for the resource represented by given imageElement.
 * By treating referenced Image resources as URLs to binary content, the browser
 * can use its internal loading/caching mechanism when working with these resources.
 * NOTE: When done using the image, don't forget to call dispose() to free allocated memory.
 *
 * @param {HTMLImageElement} imageElement fully loaded image
 * @param {String=} type optional mime type, defaults to JPEG for photographic content
 * @param {Number=} optQuality optional JPEG compression to use (when mime is JPEG) between 0 - 1
 * @return {String} Blob URL
 */
export const imageToResource = async ( imageElement, type = "image/jpeg", optQuality = .9 ) => {
    const cvs = document.createElement( "canvas" );

    cvs.width  = imageElement.naturalWidth  || imageElement.width;
    cvs.height = imageElement.naturalHeight || imageElement.height;

    cvs.getContext( "2d" ).drawImage( imageElement, 0, 0 );

    const blob = await canvasToBlob( cvs, type, optQuality );
    return blobToResource( blob );
};

// create a singular interface to create and revoke Blob URLs
// this makes it easier to backtrack the source of lingering Objects
// for debugging and spotting memory leaks, in Chrome you can access chrome://blob-internals/
// to view all allocated object URLs

export const blobToResource = blob => {
    const blobUrl = URL.createObjectURL( blob );
    // console.info( `Registed URI "${blobUrl}"` );
    return blobUrl;
};
export const disposeResource = blobURL => URL.revokeObjectURL( blobURL );

export const isResource = imageElement => imageElement.src.startsWith( "blob:" );
