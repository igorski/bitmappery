/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019-2020 - https://www.igorski.nl
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
    <modal>
        <template #header>
            <h2 v-t="'exportImage'"></h2>
        </template>
        <template #content>
            <div class="form">
                <div class="wrapper input">
                    <label v-t="'imageType'"></label>
                    <select-box :options="fileTypes"
                                 v-model="type"
                    />
                </div>
                <div
                    v-if="hasQualityOptions"
                    class="wrapper input"
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
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'export'"
                type="button"
                class="button"
                @click="exportImage()"
            ></button>
            <button
                v-t="'cancel'"
                type="button"
                class="button"
                @click="closeModal()"
            ></button>
        </template>
    </modal>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import { canvas } from "zcanvas";
import Modal      from "@/components/modal/modal";
import SelectBox  from '@/components/ui/select-box/select-box';
import Slider     from "@/components/ui/slider/slider";
import { mapSelectOptions }  from "@/utils/search-select-util";
import { getSpriteForLayer, getCanvasInstance } from "@/factories/sprite-factory";
import { EXPORTABLE_FILE_TYPES, typeToExt, isCompressableFileType } from "@/definitions/image-types";
import { createCanvas, resizeImage } from "@/utils/canvas-util";
import { saveBlobAsFile } from "@/utils/file-util";
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
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
        fileTypes() {
            return mapSelectOptions( EXPORTABLE_FILE_TYPES );
        },
        hasQualityOptions() {
            return isCompressableFileType( this.type );
        },
    },
    created() {
        this.name = this.activeDocument.name.split( "." )[ 0 ];
    },
    methods: {
        ...mapMutations([
            "closeModal",
        ]),
        async exportImage() {
            const { width, height } = this.activeDocument;
            const tempCanvas = new canvas({ width, height });
            const ctx = tempCanvas.getElement().getContext( "2d" );
            // draw existing layers onto temporary canvas at full document scale
            this.activeDocument.layers.forEach( layer => {
                const sprite = getSpriteForLayer( layer );
                sprite.draw( ctx );
            });
            const quality = parseFloat(( this.quality / 100 ).toFixed( 2 ));
            let base64 = tempCanvas.getElement().toDataURL( this.type, quality );

            // zCanvas magnifies content by the pixel ratio for a crisper result, downscale
            // to actual dimensions of the document
            const resizedImage = await resizeImage(
                base64,
                width * ( window.devicePixelRatio || 1 ),
                height * ( window.devicePixelRatio || 1 ),
                width, height,
                this.type, quality
            );
            // fetch final base64 data so we can convert it easily to binary
            base64 = await fetch( resizedImage );
            const blob = await base64.blob();
            saveBlobAsFile( blob, `${this.name}.${typeToExt(this.type)}` );
            this.closeModal();
        },
    },
};
</script>
