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
import Vue from "vue";
import {
    imageToResource, disposeResource, isResource
} from "@/utils/resource-manager";

/**
 * Image module maintains a list of local image resources (selected from file system)
 * that can be used within the application. It is separate from the document-module
 * as the images are not necessarily used within the document (yet)
 */
export default {
    state: {
        images: [],
        fileTarget: "document", // whether a newly selected file should go to new document or layer
    },
    getters: {
        images: state => state.images,
        fileTarget: state => state.fileTarget,
    },
    mutations: {
        setFileTarget( state, target ) {
            state.fileTarget = target;
        },
        /**
         * Invoke when we're done using an image in the applications life cycle.
         * This also frees memory allocated in addImage()
         */
        removeImage( state, image ) {
            const index = state.images.indexOf( image );
            disposeResource( image.source );
            if ( index === -1 ) {
                return;
            }
            Vue.delete( state.images, index );
        }
    },
    actions: {
        /**
         * Registers an image for use in the application. Internally images are
         * handled as Blob resources (or remote URLs). Base64 strings are
         * converted to binary as registered as a Blob URL.
         */
        async addImage({ state }, { file, image, size }) {
            const isValidResource = isResource( image ) || image.src.startsWith( "http" );

            const source    = isValidResource ? image.src : await imageToResource( image, file.type );
            const imageData = { file, size, source };
            state.images.push( imageData );
            return imageData;
        },
    }
};
