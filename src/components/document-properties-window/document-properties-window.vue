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
                <div class="wrapper wrapper--picker">
                    <label v-t="'backgroundColor'"></label>
                    <color-picker
                        v-model="backgroundColor"
                        v-tooltip="$t('color')"
                        color-type="HEXA"
                    />
                </div>
                <h3 v-t="'swatches'" class="title"></h3>
                <div
                    v-if="hasSwatches"
                    class="wrapper wrapper--picker-list"
                >
                    <label v-t="'availableSwatches'"></label>
                    <div class="wrapper--picker-list__container">
                        <color-picker
                            v-for="( swatch, index ) in swatches"
                            v-model="swatches[ index ]"
                            color-type="HEXA"
                        />
                    </div>
                </div>
                <p
                    v-else
                    v-t="'noSwatchesAvailable'"
                    class="expl"
                ></p>
                <div class="wrapper wrapper--picker">
                    <label v-t="'newSwatch'"></label>
                    <color-picker
                        v-model="newSwatchColor"
                        v-tooltip="$t('color')"
                        color-type="HEXA"
                    />
                    <button
                        type="button"
                        v-t="'addSwatch'"
                        class="button button--small button__add-swatch"
                        @click="addSwatch()"
                    ></button>
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
        newSwatchColor: "",
        swatches: [],
    }),
    computed: {
        ...mapGetters([
            "activeColor",
            "activeDocument",
        ]),
        isValid(): boolean {
            if ( this.swatches.some( color => !this.activeDocument.meta.swatches.includes( color ))) {
                return true;
            }
            if ( !this.activeDocument.meta.bgColor && this.backgroundColor === TRANSPARENT_COLOR ) {
                return false;
            }
            if ( this.backgroundColor !== this.activeDocument.meta.bgColor ) {
                return true;
            }
            return false;
        },
        hasSwatches(): boolean {
            return this.swatches.length > 0;
        },
    },
    created(): void {
        this.backgroundColor = this.activeDocument.meta.bgColor ?? TRANSPARENT_COLOR;
        this.swatches = [ ...this.activeDocument.meta.swatches ];
        this.newSwatchColor = this.activeColor;
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "showNotification",
            "updateMeta",
        ]),
        save(): void {
            editDocumentProperties( this.$store, this.activeDocument, { bgColor: this.backgroundColor, swatches: this.swatches });
            this.closeModal();
        },
        addSwatch(): void {
            if ( this.swatches.includes( this.newSwatchColor )) {
                this.showNotification({ title: "", message: this.$t( "duplicateColor" )});
                return;
            }
            this.swatches.push( this.newSwatchColor );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_variables";
@use "@/styles/typography";

.expl {
    @include typography.smallText();
}

.wrapper--picker-list__container {
    display: flex;
    gap: variables.$spacing-small;

    .color-picker {
        display: flex;
    }
}

.button__add-swatch {
    margin-left: variables.$spacing-small;
}
</style>