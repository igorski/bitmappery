/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
import type { ActionContext, Module } from "vuex";
import type { Document } from "@/definitions/document";
import {
    imageToResource, disposeResource, isResource
} from "@/utils/resource-manager";

type FileTarget = "document" | "layer";
type WrappedImage = {
    file: File | Blob;
    size: number;
    source: string; // (Blob) URL
    usages: string[];
};

export interface ImageState {
    images: WrappedImage[],
    fileTarget: FileTarget, // whether a newly selected file should go to new document or layer
};

export const createImageState = ( props?: Partial<ImageState> ): ImageState => ({
    images: [],
    fileTarget: "document",
    ...props,
});

/**
 * Image module maintains a list of local image resources (selected from file system)
 * that can be used within the application. It is separate from the document-module
 * as the images are not necessarily used within the document (yet)
 */
const ImageModule: Module<ImageState, any> = {
    state: (): ImageState => createImageState(),
    getters: {
        images: ( state: ImageState ): WrappedImage[] => state.images,
        fileTarget: ( state: ImageState ): FileTarget => state.fileTarget,
    },
    mutations: {
        setFileTarget( state: ImageState, target: FileTarget ): void {
            state.fileTarget = target;
        },
        /**
         * Registers a document as a user of given image source
         * this can be used to track usages and free image resources when done.
         */
        setImageSourceUsage( state: ImageState, { source, document }: { source: string, document: Document }): void {
            const image = state.images.find( image => image.source === source );
            if ( image && !image.usages.includes( document.id )) {
                image.usages.push( document.id );
            }
        },
        /**
         * Invoke when we're done using an image in the applications life cycle.
         * This also frees memory allocated in addImage()
         */
        removeImage( state: ImageState, image: WrappedImage ): void {
            const index = state.images.indexOf( image );
            disposeResource( image.source );
            if ( index === -1 ) {
                return;
            }
            delete state.images[ index ];
        },
        /**
         * Invoke when closing a document, this frees memory allocated in addImage()
         * if there are no further usages of the image.
         */
        removeImagesForDocument( state: ImageState, { id }: { id: string }): void {
            let i = state.images.length;
            while ( i-- ) {
                const { usages } = state.images[ i ];
                if ( usages.includes( id )) {
                    usages.splice( usages.indexOf( id ), 1 );
                    if ( usages.length === 0 ) {
                        disposeResource( state.images[ i ].source );
                        state.images.splice( i, 1 );
                    }
                }
            }
        }
    },
    actions: {
        /**
         * Registers an image for use in the application. Internally images are
         * handled as Blob resources (or remote URLs). Base64 strings are
         * converted to binary as registered as a Blob URL.
         */
        async addImage({ state }: ActionContext<ImageState, any>,
            { file, image, size }: { file: File | Blob, image: HTMLImageElement, size: number }
        ): Promise<WrappedImage> {
            const isValidResource = isResource( image ) || image.src.startsWith( "http" );

            const source = isValidResource ? image.src : await imageToResource( image, file.type );
            const imageData: WrappedImage = { file, size, source, usages: [] };

            state.images.push( imageData );

            return imageData;
        },
    }
};
export default ImageModule;
