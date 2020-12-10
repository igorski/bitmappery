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
import { mapGetters, mapMutations, mapActions } from "vuex";
import { loader } from "zcanvas";
import messages   from "./messages.json";

const ACCEPTED_IMAGE_TYPES = [ "image/png", "image/gif", "image/jpeg" ];

export default {
    i18n: { messages },
    data: () => ({
        acceptedImageTypes: ACCEPTED_IMAGE_TYPES,
    }),
    computed: {
        ...mapGetters([
            'layers',
        ]),
    },
    methods: {
        ...mapMutations([
            "addLayer",
            "addGraphicToLayer",
        ]),
        ...mapActions([
            "addImage",
        ]),
        async handleFileSelect({ target }) {
            const files = target?.files;
            if ( !files || files.length === 0 ) {
                return;
            }
            // load file data into memory so we can validate its contents, cache
            // the image properties upfront, and convert it to a Blob resource in the store
            const file = files[ 0 ];
            const reader = new FileReader();
            reader.onload = async ( event ) => {
                // load the image contents using the zCanvas.loader
                // which will also provide the image dimensions
                try {
                    const imageSource = reader.result;
                    const { image, size } = await loader.loadImage( imageSource );
                    const { source }      = await this.addImage({ file, image, size });
                    // TODO: the below is test code
                    image.src = source;
                    this.addLayer();
                    this.addGraphicToLayer({ index: this.layers.length - 1, bitmap: image });
                } catch {
                    // TODO: show warning
                }
            };
            reader.readAsDataURL( file );
        },
    }
};
</script>
