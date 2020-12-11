import Vue from "vue";
import { imageToSource, disposeSource } from "@/utils/memory-util";

/**
 * Image module maintains a list of local image resources (selected from file system)
 * that can be used within the application. It is separate from the document-module
 * as the images are not necessarily used within the document (yet)
 */
export default {
    state: {
        images: [],
    },
    getters: {
        images: state => state.images,
    },
    mutations: {
        /**
         * Invoke when we"re done using an image in the applications life cycle.
         * This also frees memory allocated in addImage()
         */
        removeImage( state, image ) {
            const index = state.images.indexOf( image );
            disposeSource( image.source );
            if ( index === -1 ) {
                return;
            }
            Vue.delete( state.images, index );
        }
    },
    actions: {
        /**
         * Registers an image for use in the application.
         */
        async addImage({ state }, { file, image, size }) {
            const source    = await imageToSource( image, file.type );
            const imageData = { file, size, source };
            state.images.push( imageData );
            return imageData;
        },
    }
};
