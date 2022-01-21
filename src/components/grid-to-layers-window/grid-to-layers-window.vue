/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022 - https://www.igorski.nl
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
    <modal class="grid-to-layers">
        <template #header>
            <h2 v-t="'sliceGridToLayers'"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="requestSlice()">
                <p v-t="'gridSliceExpl'" class="expl"></p>
                <p>{{ $t( "currentDocumentSize", { width: Math.round( activeDocument.width ), height: Math.round( activeDocument.height ) }) }}</p>
                <div class="wrapper input">
                    <label v-t="'width'"></label>
                    <input
                        ref="widthInput"
                        v-model.number="width"
                        type="number"
                        name="width"
                        class="input-field"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'height'"></label>
                    <input
                        v-model.number="height"
                        type="number"
                        name="height"
                        class="input-field"
                    />
                </div>
                <p v-t="'layerVisibilityExpl'" class="expl"></p>
                <div class="wrapper input">
                    <label v-t="'allLayersVisible'"></label>
                    <toggle-button
                        v-model="allVisible"
                        name="allVisible"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'slice'"
                type="button"
                class="button"
                :disabled="!isValid"
                @click="requestSlice()"
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
import { ToggleButton } from "vue-js-toggle-button";
import Modal from "@/components/modal/modal";
import { enqueueState } from "@/factories/history-state-factory";
import LayerFactory from "@/factories/layer-factory";
import { renderFullSize, sliceTiles } from "@/utils/document-util";
import { focus } from "@/utils/environment-util";

import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Modal,
        ToggleButton,
    },
    data: () => ({
        width      : 0,
        height     : 0,
        allVisible : true,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "layers",
        ]),
        isValid() {
            return this.width > 0 && this.height > 0 &&
                   ( this.width !== this.activeDocument.width || this.height !== this.activeDocument.height );
        },
    },
    created() {
        this.width  = Math.round( this.activeDocument.width  / 2 );
        this.height = Math.round( this.activeDocument.height / 2 );
    },
    mounted() {
        focus( this.$refs.widthInput );
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setLoading",
            "unsetLoading",
        ]),
        requestSlice() {
            this.setLoading( "slice" );

            // collect existing layers
            const originalLayers = [ ...this.activeDocument.layers ];
            const originalWidth  = this.activeDocument.width;
            const originalHeight = this.activeDocument.height;
            // flatten document
            const flattenedLayer = renderFullSize( this.activeDocument );
            // create layers from slices created from the flattened document
            const { width, height } = this;
            const slicedTiles  = sliceTiles( flattenedLayer, width, height );
            const slicedLayers = slicedTiles.map(( bitmap, index ) => {
                return LayerFactory.create({
                    name   : `${this.$t( "slice" )} #${index + 1}`,
                    source : bitmap,
                    visible : this.allVisible ? true : index === slicedTiles.length - 1,
                    width,
                    height
                });
            });
            // commit changes, add to state history
            const store = this.$store;
            const commit = () => {
                // remove existing layer(s)
                let i = originalLayers.length;
                while ( i-- ) {
                    store.commit( "removeLayer", 0 );
                }
                // add sliced layers
                slicedLayers.forEach(( layer, index ) => {
                    store.commit( "insertLayerAtIndex", { index, layer });
                });
                store.commit( "setActiveDocumentSize", { width, height });
            };
            commit();
            enqueueState( "slice-to-layers", {
                undo() {
                    let i = slicedLayers.length;
                    while ( i-- ) {
                        store.commit( "removeLayer", i );
                    }
                    originalLayers.forEach(( layer, index ) => store.commit( "insertLayerAtIndex", { index, layer }));
                    store.commit( "setActiveDocumentSize", { width: originalWidth, height: originalHeight });
                },
                redo: commit,
            });
            this.unsetLoading( "slice" );
            this.closeModal();
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/typography";
@import "@/styles/ui";

.grid-to-layers {
    @include modalBase( 480px, 470px );
}

.expl {
    @include smallText();
}
</style>
