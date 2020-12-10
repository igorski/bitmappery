<template>
    <fieldset>
        <label v-t="'selectLocalImageFile'" for="file"></label>
        <input type="file" id="file"
               :accept="acceptedImageTypes"
               @change="handleFileSelect"
        />
    </fieldset>
</template>

<script>
import { loader } from 'zcanvas';
import messages from './messages.json';

const ACCEPTED_IMAGE_TYPES = [ "image/png", "image/gif", "image/jpeg" ];

export default {
    i18n: { messages },
    data: () => ({
        acceptedImageTypes: ACCEPTED_IMAGE_TYPES,
    }),
    methods: {
        async handleFileSelect({ target }) {
            const files = target?.files;
            if ( !files || files.length === 0 ) {
                return;
            }
            // load file data into memory
            const file = files[ 0 ];
            const reader = new FileReader();
            reader.onload = async ( event ) => {
                // load the image contents using the zCanvas.loader
                // which will also provide the image dimensions
                try {
                    const { image, size } = await loader.loadImage( reader.result );
                    // TODO: make Blob from image source
                    this.addImage({ file, size });
                } catch {
                    // TODO: show warning
                }
            };
            reader.readAsDataURL( file );
        },
    }
};
</script>
