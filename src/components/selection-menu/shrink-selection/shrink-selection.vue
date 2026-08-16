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
    <modal class="selection-size">
        <template #header>
            <h2 class="component__title">{{ t( "shrinkSelection" ) }}</h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="requestSave()">
                <div class="wrapper wrapper--input">
                    <label v-tooltip.left="t('shrinkTooltip')">{{ t( "shrinkBy" ) }}</label>
                    <input
                        ref="sizeInput"
                        type="number"
                        v-model.number="size"
                        class="input-field"
                        :min="minShrink"
                        :max="maxShrink"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                type="button"
                class="button"
                :disabled="!isValid"
                @click="requestSave()"
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
import { applyScaleToSelection } from "@/model/actions/selection-scale";
import { focus } from "@/utils/environment-util";
import { selectionToRectangle } from "@/utils/selection-util";
import messages from "./messages.json";

const MIN_SHRINK = 0;
const MAX_SHRINK = 2000;

export default {
    components: {
        Modal,
    },
    data: () => ({
        size: 10,
    }),
    setup(): { t: ComposerTranslation } {
        const { t } = useI18n({ messages });
        return { t };
    },
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
        isValid(): boolean {
            return typeof this.size === "number" && this.size >= this.minShrink && this.size <= this.maxShrink;
        },
    },
    created(): void {
        this.selectionSize = selectionToRectangle( this.activeDocument.activeSelection );

        const minSize = Math.min( this.selectionSize.width, this.selectionSize.height );

        this.minShrink = MIN_SHRINK;
        this.maxShrink = ( minSize - MAX_SHRINK ) < 0 ? minSize - 10 : MAX_SHRINK;
    },
    mounted(): void {
        focus( this.$refs.sizeInput );
    },
    methods: {
        ...mapMutations([
            "closeModal",
        ]),
        requestSave(): void {
            if ( !this.isValid ) {
                return;
            }
            const { width } = this.selectionSize;
            const scale = ( width - ( this.size * 2 )) / width;

            applyScaleToSelection( this.$store, this.activeDocument, scale );
            this.closeModal();
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/ui";

.selection-size {
    @include ui.modalBase( 320px, 120px );
}
</style>