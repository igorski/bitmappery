/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022 - https://www.igorski.nl
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
    <div class="tool-option">
        <h3 v-t="'fill'"></h3>
        <div class="wrapper full slider">
            <label v-t="'smartFill'"></label>
            <toggle-button
                v-model="smartFill"
                name="smartFill"
                :disabled="disabled"
            />
        </div>
        <p v-t="'smartFillExpl'" class="expl"></p>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import ToolTypes, { canDraw } from "@/definitions/tool-types";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        ToggleButton,
    },
    computed: {
        ...mapGetters([
            "activeDocument",
            "activeLayer",
            "activeLayerMask",
            "fillOptions",
        ]),
        disabled(): boolean {
            return !canDraw( this.activeDocument, this.activeLayer, this.activeLayerMask );
        },
        smartFill: {
            get(): boolean {
                return this.fillOptions.smartFill;
            },
            set( value: boolean ): void {
                this.setToolOptionValue({
                    tool: ToolTypes.FILL,
                    option: "smartFill",
                    value
                });
            }
        }
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/tool-option";
@use "@/styles/typography";

.expl {
    @include typography.smallText();
}
</style>
