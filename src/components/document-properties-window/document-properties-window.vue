/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
            <h2 v-t="'documentProperties'" class="component__title"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="save()">
                <h3 v-t="'options'" class="title"></h3>
                <div class="wrapper input">
                    <label v-t="'backgroundColor'"></label>
                    <color-picker
                        v-model="backgroundColor"
                        v-tooltip="$t('color')"
                        color-type="HEXA"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'save'"
                type="button"
                class="button"
                :disabled="!isValid"
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
import Modal from "@/components/modal/modal.vue";
import ColorPicker from "@/components/ui/color-picker/color-picker.vue";
import { editDocumentProperties, TRANSPARENT_COLOR } from "@/store/actions/document-properties-edit";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        ColorPicker,
        Modal,
    },
    data: () => ({
        backgroundColor: "",
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
        isValid(): boolean {
            if ( !this.activeDocument.meta.bgColor && this.backgroundColor === TRANSPARENT_COLOR ) {
                return false;
            }
            return this.backgroundColor !== this.activeDocument.meta.bgColor;
        },
    },
    created(): void {
        this.backgroundColor = this.activeDocument.meta.bgColor ?? TRANSPARENT_COLOR;
    },
    methods: {
        ...mapMutations([
            "closeModal",
        ]),
        save(): void {
            editDocumentProperties( this.$store, this.activeDocument, { bgColor: this.backgroundColor });
            this.closeModal();
        },
    },
};
</script>
