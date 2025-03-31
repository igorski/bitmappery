/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022-2025 - https://www.igorski.nl
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
            <h2 v-t="'sliceGridToLayers'" class="component__title"></h2>
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

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import Modal from "@/components/modal/modal.vue";
import { sliceGridToLayers } from "@/store/actions/slice-grid-to-layers";
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
        isValid(): boolean {
            return this.width > 0 && this.height > 0 &&
                   ( this.width !== this.activeDocument.width || this.height !== this.activeDocument.height );
        },
    },
    created(): void {
        this.width  = Math.round( this.activeDocument.width  / 2 );
        this.height = Math.round( this.activeDocument.height / 2 );
    },
    mounted(): void {
        focus( this.$refs.widthInput );
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setLoading",
            "unsetLoading",
        ]),
        async requestSlice(): Promise<void> {
            this.setLoading( "slice" );
            await sliceGridToLayers( this.$store, this.activeDocument, this.width, this.height, this.allVisible, this.$t( "slice" ));
            this.unsetLoading( "slice" );
            this.closeModal();
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/typography";
@use "@/styles/ui";

.grid-to-layers {
    @include ui.modalBase( 480px, 470px );
}

.expl {
    @include typography.smallText();
}
</style>
