/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
            <h2 v-t="'addNewLayer'"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="requestLayerAdd()">
                <div class="wrapper input">
                    <label v-t="'layerName'"></label>
                    <input ref="nameInput"
                           type="text"
                           v-model="name"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'add'"
                type="button"
                class="button"
                :disabled="!isValid"
                @click="requestLayerAdd()"
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
import { mapGetters, mapMutations, mapActions } from "vuex";
import Modal from "@/components/modal/modal";
import { LAYER_GRAPHIC } from "@/definitions/layer-types";

import messages from "./messages.json";
export default {
    i18n: { messages },
    components: {
        Modal,
    },
    data: () => ({
        name: "",
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "layers",
        ]),
        isValid() {
            return this.name.length > 0;
        },
    },
    mounted() {
        this.name = this.$t( "newLayerNum", { num: this.layers.length + 1 }),
        this.$refs.nameInput.focus();
    },
    methods: {
        ...mapMutations([
            "addLayer",
            "closeModal",
        ]),
        requestLayerAdd() {
            if ( !this.isValid ) {
                return;
            }
            this.addLayer({
                name: this.name,
                type: LAYER_GRAPHIC,
                width: this.activeDocument.width,
                height: this.activeDocument.height
            });
            this.closeModal();
        },
    },
};
</script>
