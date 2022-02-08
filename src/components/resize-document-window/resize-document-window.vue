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

<script>
import { mapGetters, mapMutations } from "vuex";
import { ToggleButton } from "vue-js-toggle-button";
import Modal from "@/components/modal/modal";
import DimensionsFormatter from "@/components/ui/dimensions-formatter/dimensions-formatter";
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
    created() {
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
            "setActiveDocumentSize",
            "resizeActiveDocumentContent",
            "openDialog",
            "resetHistory"
        ]),
        async lockSync() {
            this.syncLock = true;
            await this.$nextTick();
            this.syncLock = false;
        },
        save() {
            this.openDialog({
                type: "confirm",
                title: this.$t( "areYouSure" ),
                message: this.$t( "resizeIsPermanent" ),
                confirm: async () => {
                    const { width, height } = this.dimensions;
                    const scaleX = width  / this.activeDocument.width;
                    const scaleY = height / this.activeDocument.height;

                    await this.resizeActiveDocumentContent({ scaleX, scaleY });
                    this.setActiveDocumentSize({ width: Math.round( width ), height: Math.round( height ) });
                    this.resetHistory();
                    this.closeModal();
                },
                cancel: () => {},
            });
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/ui";

.resize-document {
    @include modalBase( 480px, 310px );
}
</style>
