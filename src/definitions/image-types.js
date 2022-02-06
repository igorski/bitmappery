/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
import { isSafari } from "@/utils/environment-util";

// 1. all image formats supported by BitMappery

export const JPEG = { mime: "image/jpeg", ext: "jpg" };
export const PNG  = { mime: "image/png",  ext: "png" };
export const GIF  = { mime: "image/gif",  ext: "gif" };
export const WEBP = { mime: "image/webp", ext: "webp" };

export const ALL_IMAGE_TYPES = [ JPEG, PNG, GIF, WEBP ];

const COMPRESSABLE_TYPES = [ JPEG, WEBP ];
const TRANSPARENT_TYPES  = [ PNG, GIF, WEBP ];

// 2. all image formats supported by all supported platforms

export const ACCEPTED_IMAGE_TYPES      = [ JPEG.mime, PNG.mime, GIF.mime ];
export const ACCEPTED_IMAGE_EXTENSIONS = [ JPEG.ext, "jpeg", PNG.ext, GIF.ext ];
export const EXPORTABLE_IMAGE_TYPES    = [ JPEG.mime, PNG.mime ]; // GIF can be exported using library

// 3. environment specific overrides

if ( !isSafari() ) {
    // webp is currently supported by every browser with exception of Safari, see
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL#browser_compatibility
    const { mime, ext } = WEBP;

    ACCEPTED_IMAGE_TYPES.push( mime );
    ACCEPTED_IMAGE_EXTENSIONS.push( ext );
    EXPORTABLE_IMAGE_TYPES.push( mime );
}

// 4. utility methods

export const isCompressableFileType = type => COMPRESSABLE_TYPES.some(({ mime }) => mime === type );

export const isTransparent = ({ name, type }) => {
    if ( type === "dropbox" ) {
        // files imported from Dropbox don't list their mime type, derive from filename instead
        return TRANSPARENT_TYPES.some(({ ext }) => name.includes( ext ));
    }
    return TRANSPARENT_TYPES.some(({ mime }) => mime === type );
}

export const typeToExt = mimeType => {
    const format = ALL_IMAGE_TYPES.find(({ mime }) => mime === mimeType );
    if ( !format ) {
        throw new Error( `Unsupported type ${mimeType} provided` );
    }
    return format.ext;
};
