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
import { createCanvas, canvasToBlob } from "@/utils/canvas-util";

const { URL } = window;

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
    const { cvs, ctx } = createCanvas();

    cvs.width  = imageElement.naturalWidth  || imageElement.width;
    cvs.height = imageElement.naturalHeight || imageElement.height;

    ctx.drawImage( imageElement, 0, 0 );

    const blob = await canvasToBlob( cvs, type, optQuality );
    return URL.createObjectURL( blob );
};

export const disposeResource = imageBlobURL => {
    URL.revokeObjectURL( imageBlobURL );
};

export const isResource = imageElement => imageElement.src.startsWith( "blob:" );
