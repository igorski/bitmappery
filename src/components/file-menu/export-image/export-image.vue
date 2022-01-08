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
<template>
    <modal class="export-modal">
        <template #header>
            <h2 v-t="'exportImage'"></h2>
        </template>
        <template #content>
            <div class="export-ui">
                <div class="form export-form" @keyup.enter="exportImage">
                    <div class="wrapper input">
                        <label v-t="'imageType'"></label>
                        <select-box :options="fileTypes"
                                     v-model="type"
                        />
                    </div>
                    <div
                        v-if="hasQualityOptions"
                        class="wrapper slider"
                    >
                        <label v-t="'imageQuality'"></label>
                        <slider
                            v-model="quality"
                            :min="0"
                            :max="100"
                        />
                    </div>
                    <div class="wrapper input">
                        <label v-t="'fileName'"></label>
                        <input
                            type="text"
                            v-model="name"
                            class="input-field"
                        />
                    </div>
                    <div v-if="fileSize" class="wrapper input">
                        <label v-t="'fileSize'"></label>
                        <div class="form-element">{{ fileSize }}</div>
                    </div>
                </div>
                <div
                    v-if="base64preview"
                    class="preview-wrapper"
                >
                    <div class="preview-container">
                        <img :src="base64preview" class="preview-image" />
                    </div>
                </div>
            </div>
        </template>
        <template #actions>
            <div class="export-actions">
                <button
                    v-t="'export'"
                    type="button"
                    class="button"
                    :disabled="isLoading"
                    @click="exportImage()"
                ></button>
                <button
                    v-t="'cancel'"
                    type="button"
                    class="button"
                    @click="closeModal()"
                ></button>
            </div>
        </template>
    </modal>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import Modal      from "@/components/modal/modal";
import SelectBox  from '@/components/ui/select-box/select-box';
import Slider     from "@/components/ui/slider/slider";
import { mapSelectOptions }  from "@/utils/search-select-util";
import { EXPORTABLE_FILE_TYPES, typeToExt, isCompressableFileType } from "@/definitions/image-types";
import { createDocumentSnapshot } from "@/utils/document-util";
import { resizeToBase64 } from "@/utils/canvas-util";
import { saveBlobAsFile } from "@/utils/file-util";
import { displayAsKb } from "@/utils/string-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Modal,
        SelectBox,
        Slider,
    },
    data: () => ({
        name: "",
        type: EXPORTABLE_FILE_TYPES[ 0 ],
        quality: 95,
        base64preview: null,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "isLoading",
        ]),
        fileTypes() {
            return mapSelectOptions( EXPORTABLE_FILE_TYPES );
        },
        hasQualityOptions() {
            return isCompressableFileType( this.type );
        },
        qualityPercentile() {
            return parseFloat(( this.quality / 100 ).toFixed( 2 ));
        },
        fileSize() {
            if ( !this.base64preview ) {
                return null;
            }
            return displayAsKb( Math.round( this.base64preview.length * 6 / 8 ));
        },
    },
    watch: {
        quality() {
            this.renderPreview();
        },
        type() {
            this.renderPreview();
        },
    },
    created() {
        this.name = this.activeDocument.name.split( "." )[ 0 ];
        this.renderPreview();
    },
    beforeDestroy() {
        this.base64preview = null;
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setLoading",
            "unsetLoading",
        ]),
        async exportImage() {
            this.closeModal();
            this.setLoading( "exp" );

            // zCanvas magnifies content by the pixel ratio for a crisper result, downscale
            // to actual dimensions of the document
            const { width, height } = this.activeDocument;
            const resizedImage = await resizeToBase64(
                this.base64preview,
                width,
                height,
                this.type,
                this.qualityPercentile,
                width  * ( window.devicePixelRatio || 1 ),
                height * ( window.devicePixelRatio || 1 )
            );
            // fetch final base64 data so we can convert it easily to binary
            const base64 = await fetch( resizedImage );
            const blob = await base64.blob();

            saveBlobAsFile( blob, `${this.name}.${typeToExt(this.type)}` );
            this.unsetLoading( "exp" );
        },
        async renderPreview() {
            this.setLoading( "preview" );

            const snapshotCvs = await createDocumentSnapshot( this.activeDocument );
            const { width, height } = this.activeDocument;
            const quality = parseFloat(( this.quality / 100 ).toFixed( 2 ));
            this.base64preview = snapshotCvs.toDataURL( this.type, this.qualityPercentile );

            this.unsetLoading( "preview" );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";
@import "@/styles/ui";

.export-modal {
    $idealWidth: 990px;
    $idealHeight: 500px;
    @include modalBase( $idealWidth, $idealHeight );

    .export-actions {
        display: flex;
    }

    @include componentIdeal( $idealWidth, $idealHeight ) {
        position: relative;

        .export-ui {
            display: flex;
            justify-content: space-between;
        }

        .export-form,
        .export-actions {
            flex: 0.4;
            margin-right: $spacing-xlarge;
        }

        .preview-wrapper {
            flex: 0.6;
            height: 445px;
            overflow-x: hidden; // image is always full width
            overflow-y: scroll;
        }

        .export-actions {
            button {
                flex: 0.5;
            }
        }
    }

    @include componentFallback( $idealWidth, $idealHeight ) {
        .preview-image {
            margin: $spacing-medium 0;
        }
        .export-actions {
            width: 100%;
        }
    }
}

.preview-image {
    width: 100%;
}
</style>
