/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
    <div
        class="tool-option"
        @focusin="handleFocus"
        @focusout="handleBlur"
    >
        <h3 v-t="'magicWand'"></h3>
        <p v-t="'wandDescr'"></p>
        <div class="wrapper full slider">
            <label v-t="'sampleMerged'"></label>
            <toggle-button
                v-model="sampleMerged"
                name="sampleMerged"
                sync
                :disabled="!activeLayer"
            />
        </div>
        <div class="wrapper full input">
            <label v-t="'threshold'"></label>
            <input
                type="number"
                v-model.number="threshold"
                class="input-field threshold"
                :min="1"
                :max="100"
                :disabled="!activeLayer"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import KeyboardService from "@/services/keyboard-service";
import ToolTypes from "@/definitions/tool-types";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        ToggleButton,
    },
    computed: {
        ...mapGetters([
            "activeLayer",
            "wandOptions",
        ]),
        sampleMerged: {
            get(): boolean {
                return this.wandOptions.sampleMerged;
            },
            set( value: boolean ): void {
                this.setToolOptionValue({
                    tool: ToolTypes.WAND,
                    option: "sampleMerged",
                    value
                });
            }
        },
        threshold: {
            get(): number {
                return this.wandOptions.threshold;
            },
            set( value: number ): void {
                this.setToolOptionValue({
                    tool: ToolTypes.WAND,
                    option: "threshold",
                    value
                });
            }
        },
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
        handleFocus(): void {
            KeyboardService.setSuspended( true );
        },
        handleBlur(): void {
            KeyboardService.setSuspended( false );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/tool-option";

.threshold {
    width: 75px !important;
}
</style>
