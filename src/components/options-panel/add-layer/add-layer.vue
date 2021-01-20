/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
                           class="input-field"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'layerType'"></label>
                    <select-box :options="layerTypes"
                                 v-model="type"
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
import Modal     from "@/components/modal/modal";
import SelectBox from '@/components/ui/select-box/select-box';
import LayerFactory from "@/factories/layer-factory";
import { enqueueState } from "@/factories/history-state-factory";
import { LAYER_GRAPHIC, LAYER_TEXT } from "@/definitions/layer-types";

import messages from "./messages.json";
export default {
    i18n: { messages },
    components: {
        Modal,
        SelectBox,
    },
    data: () => ({
        name: "",
        type: LAYER_GRAPHIC,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "activeLayerIndex",
            "layers",
        ]),
        layerTypes() {
            return [
                { label: this.$t( "graphic" ), value: LAYER_GRAPHIC },
                { label: this.$t( "text" ), value: LAYER_TEXT },
            ];
        },
        isValid() {
            return this.name.length > 0 && this.type;
        },
    },
    mounted() {
        this.$refs.nameInput.focus();
    },
    methods: {
        ...mapMutations([
            "closeModal",
        ]),
        requestLayerAdd() {
            if ( !this.isValid ) {
                return;
            }
            const newLayer = LayerFactory.create({
                 name   : this.name,
                 type   : this.type,
                 width  : this.activeDocument.width,
                 height : this.activeDocument.height
            });
            const store  = this.$store;
            const commit = () => store.commit( "addLayer", newLayer );
            commit();
            const addedLayerIndex = this.activeLayerIndex;

            enqueueState( `layerAdd_${addedLayerIndex}`, {
                undo() {
                    store.commit( "removeLayer", addedLayerIndex );
                },
                redo: commit,
            });
            this.closeModal();
        },
    },
};
</script>
