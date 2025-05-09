/**
* The MIT License (MIT)
*
* Igor Zinken 2020-2025 - https://www.igorski.nl
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
    <modal class="resize-document">
        <template #header>
            <h2 v-t="'resizeDocument'" class="component__title"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="save()">
                <div class="wrapper input">
                    <label v-t="'maintainAspectRatio'"></label>
                    <toggle-button
                        v-model="maintainRatio"
                        name="ratio"
                    />
                </div>
                <dimensions-formatter
                    v-model="dimensions"
                />
            </div>
        </template>
        <template #actions>
            <button
                v-t="'save'"
                type="button"
                class="button"
                @click="save()"
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
import DimensionsFormatter from "@/components/ui/dimensions-formatter/dimensions-formatter.vue";
import { resizeDocument } from "@/store/actions/document-resize";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Modal,
        ToggleButton,
        DimensionsFormatter,
    },
    data: () => ({
        dimensions: {
            width: 0,
            height: 0,
        },
        ratio: 0,
        syncLock: false,
        maintainRatio: true,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
        width() {
            return this.dimensions.width;
        },
        height() {
            return this.dimensions.height;
        },
    },
    created(): void {
        this.dimensions.width  = this.activeDocument.width;
        this.dimensions.height = this.activeDocument.height;
        this.ratio = this.dimensions.width / this.dimensions.height;

        this.$watch( "width", function( value ) {
            if ( !this.maintainRatio || this.syncLock ) {
                return;
            }
            this.lockSync();
            this.dimensions.height = Math.round( value / this.ratio );
        });

        this.$watch( "height", function( value ) {
            if ( !this.maintainRatio || this.syncLock ) {
                return;
            }
            this.lockSync();
            this.dimensions.width = Math.round( value * this.ratio );
        });
    },
    methods: {
        ...mapMutations([
            "closeModal",
        ]),
        async lockSync(): Promise<void> {
            this.syncLock = true;
            await this.$nextTick();
            this.syncLock = false;
        },
        async save(): Promise<void> {
            await resizeDocument( this.$store, this.activeDocument, this.dimensions );
            this.closeModal();
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/ui";

.resize-document {
    @include ui.modalBase( 480px, 310px );
}
</style>
