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
            <h2 v-t="'resizeDocument'"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="save()">
                <div class="wrapper input">
                    <label v-t="'width'"></label>
                    <input
                        ref="first"
                        v-model="width"
                        type="number"
                        name="width"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'maintainAspectRatio'"></label>
                    <input
                        v-model="maintainRatio"
                        type="checkbox"
                        name="ratio"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'height'"></label>
                    <input
                        v-model="height"
                        type="number"
                        name="height"
                    />
                </div>
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
import Modal from "@/components/modal/modal";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Modal,
    },
    data: () => ({
        width: 0,
        height: 0,
        ratio: 0,
        syncLock: false,
        maintainRatio: true,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
    },
    mounted() {
        this.width  = this.activeDocument.width;
        this.height = this.activeDocument.height;
        this.ratio  = this.width / this.height;

        this.$watch( "width", function( value ) {
            if ( !this.maintainRatio || this.syncLock ) {
                return;
            }
            this.lockSync();
            this.height = Math.round( value / this.ratio );
        });

        this.$watch( "height", function( value ) {
            if ( !this.maintainRatio || this.syncLock ) {
                return;
            }
            this.lockSync();
            this.width = Math.round( value * this.ratio );
        });
        this.$refs.first.focus();
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setActiveDocumentSize",
        ]),
        lockSync() {
            this.syncLock = true;
            this.$nextTick(() => {
                this.syncLock = false;
            });
        },
        save() {
            this.setActiveDocumentSize({ width: this.width, height: this.height });
            this.closeModal();
        },
    }
};
</script>
