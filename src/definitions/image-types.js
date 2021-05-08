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
export const JPEG = "image/jpeg";
export const PNG  = "image/png";
export const GIF  = "image/gif";

const TRANSPARENT_TYPES = [ PNG, GIF ];

export const ACCEPTED_FILE_TYPES      = [ JPEG, PNG, GIF ];
export const ACCEPTED_FILE_EXTENSIONS = [ "jpg", "jpeg", "png", "gif" ];
export const EXPORTABLE_FILE_TYPES    = [ JPEG, PNG ];
export const PROJECT_FILE_EXTENSION   = ".bpy"; // BitMappery document

// for file input selectors, we allow selection of both BitMappery Documents and all accepted image types
export const FILE_EXTENSIONS = [ ...ACCEPTED_FILE_TYPES, PROJECT_FILE_EXTENSION ];

export const isCompressableFileType = type => type === JPEG;

export const isTransparent = ({ name, type }) => {
    if ( type === "dropbox" ) {
        // files imported from Dropbox don't list their mime type, derive from filename instead
        return name.includes( ".png" ) || name.includes( ".gif" );
    }
    return TRANSPARENT_TYPES.includes( type );
}

export const typeToExt = type => {
    switch ( type ) {
        default:
            throw new Error( `Unsupported type ${type} provided` );
        case JPEG:
            return ACCEPTED_FILE_EXTENSIONS[ 0 ];
        case PNG:
            return ACCEPTED_FILE_EXTENSIONS[ 2 ];
        case GIF:
            return ACCEPTED_FILE_EXTENSIONS[ 3 ];
    }
};

// the maximum size we support for an image, this is for the dominant side of the image
// the max is 8192 for IE with 32767 for Safari, FF and Chrome.
export const MAX_IMAGE_SIZE = 8192;
// the maximum amount of megapixels an image can be represented at in the application
export const MAX_MEGAPIXEL  = MAX_IMAGE_SIZE * MAX_IMAGE_SIZE;
