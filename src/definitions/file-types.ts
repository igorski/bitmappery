/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
import { ALL_IMAGE_TYPES, ACCEPTED_IMAGE_TYPES, ACCEPTED_IMAGE_EXTENSIONS, JPEG } from "@/definitions/image-types";

export const PROJECT_FILE_EXTENSION = "bpy"; // BitMappery document
export const PREVIEW_THUMBNAIL = "bpp"; // BitMappery document preview

export const PSD = { mime: "image/vnd.adobe.photoshop", ext: "psd" };
export const PDF = { mime: "application/pdf", ext: "pdf" };

export const ACCEPTED_FILE_TYPES      = [ ...ACCEPTED_IMAGE_TYPES, PSD.mime, PDF.mime ];
export const ACCEPTED_FILE_EXTENSIONS = [ ...ACCEPTED_IMAGE_EXTENSIONS, PROJECT_FILE_EXTENSION, PSD.ext, PDF.ext ];
export const THIRD_PARTY_DOCUMENTS    = [ PSD, PDF ];

export const isImageFile = ( item: File ): boolean => ACCEPTED_IMAGE_TYPES.includes( item.type );

export const isProjectFile = ( file: File ): boolean => {
    const [ , ext ] = file.name.split( "." );
    return ext === PROJECT_FILE_EXTENSION;
};

export const getMimeForThirdPartyDocument = ( file: File ): string | undefined => {
    const [ , fileExtension ] = file.name.split( "." );
    return THIRD_PARTY_DOCUMENTS.find(({ ext }) => ext === fileExtension )?.mime;
};

export const isThirdPartyDocument = ( file: File ): boolean => {
    return getMimeForThirdPartyDocument( file ) !== undefined;
};

export const getMimeByFileName = ( fileName: string ): string | undefined => {
    const arr = fileName.split( "." );
    const fileExtension = arr[ arr.length - 1 ].replace( "/", "" );

    if ( fileExtension === "jpeg" ) {
        return JPEG.mime;
    }

    if ( fileExtension === PREVIEW_THUMBNAIL ) {
        return PREVIEW_THUMBNAIL;
    }

    if ( fileExtension === PROJECT_FILE_EXTENSION ) {
        return PROJECT_FILE_EXTENSION;
    }
    const imageType = ALL_IMAGE_TYPES.find( type => type.ext === fileExtension );

    if ( imageType ) {
        return imageType.mime;
    }
    return THIRD_PARTY_DOCUMENTS.find( type => type.ext === fileExtension )?.mime
};
