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
            <h2 class="component__title">{{ t( "documentProperties" ) }}</h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="save()">
                <h3 class="title">{{ t( "options" ) }}</h3>
                <div class="wrapper wrapper--picker">
                    <label>{{ t( "backgroundColor" ) }}</label>
                    <color-picker
                        v-model="backgroundColor"
                        v-tooltip="t('color')"
                        color-type="HEXA"
                    />
                </div>
                <h3 class="title">{{ t( "swatches" ) }}</h3>
                <div
                    v-if="hasSwatches"
                    class="wrapper wrapper--picker-list"
                >
                    <label>{{ t( "availableSwatches" ) }}</label>
                    <div class="wrapper--picker-list__container">
                        <color-picker
                            v-for="( _swatch, index ) in swatches"
                            v-model="swatches[ index ]"
                            color-type="HEXA"
                        />
                    </div>
                </div>
                <p
                    v-else
                    class="expl"
                >{{ t( "noSwatchesAvailable" ) }}</p>
                <div class="wrapper wrapper--picker">
                    <label>{{ t( "newSwatch" ) }}</label>
                    <color-picker
                        v-model="newSwatchColor"
                        v-tooltip="t('color')"
                        color-type="HEXA"
                    />
                    <button
                        type="button"
                        class="button button--small button__add-swatch"
                        @click="addSwatch()"
                    >{{ t( "addSwatch" ) }}</button>
                </div>
            </div>
        </template>
        <template #actions>
            <button
                type="button"
                class="button"
                :disabled="!isValid"
                @click="save()"
            >{{ t( "save" ) }}</button>
            <button
                type="button"
                class="button"
                @click="closeModal()"
            >{{ t( "cancel" ) }}</button>
        </template>
    </modal>
</template>

<script lang="ts">
import { type ComposerTranslation, useI18n } from "vue-i18n";
import { mapGetters, mapMutations } from "vuex";
import Modal from "@/components/modal/modal.vue";
import ColorPicker from "@/components/ui/color-picker/color-picker.vue";
import { editDocumentProperties, TRANSPARENT_COLOR } from "@/model/actions/document-properties-edit";
import messages from "./messages.json";

export default {
    components: {
        ColorPicker,
        Modal,
    },
    data: () => ({
        backgroundColor: "",
        newSwatchColor: "",
        swatches: [],
    }),
    setup(): { t: ComposerTranslation } {
        const { t } = useI18n({ messages });
        return { t };
    },
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
                this.showNotification({ title: "", message: this.t( "duplicateColor" )});
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