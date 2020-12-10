import Vue from 'vue';
import { imageToSource, disposeSource } from '@/utils/memory-util';

export default {
    state: {
        images: [],
    },
    getters: {
        images: state => state.images,
    },
    mutations: {
        /**
         * Invoke when we're done using an image in the applications life cycle.
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
        async addImage( state, { file, imageElement, size }) {
            const source = await imageToSource( imageElement );
            state.images.push({ file, size, source });
        },
    }
};
