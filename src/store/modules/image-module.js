import Vue from 'vue';

export default {
    state: {
        images: [],
    },
    getters: {

    },
    mutations: {
        addImage( state, { file, size }) {
            state.images.push({ file, size });
        },
        removeImage( state, image ) {
            const index = state.images.indexOf( image );
            if ( index === -1 ) {
                return;
            }
            Vue.delete( state.images, index );
        }
    },
};
