/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
        <h3 v-t="'selection'"></h3>
        <div class="wrapper input">
            <label v-t="'lockAspectRatio'" v-tooltip="$t('shiftKey')"></label>
            <toggle-button
                v-model="maintainRatio"
                name="ratio"
                sync
            />
        </div>
        <div class="wrapper input">
            <label v-t="'widthByHeight'"></label>
            <input
                type="text"
                v-model.number="xRatio"
                class="input-field half"
                :disabled="!maintainRatio"
            />
            <input
                type="text"
                v-model.number="yRatio"
                class="input-field half"
                :disabled="!maintainRatio"
            />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import ToolTypes from "@/definitions/tool-types";
import { ToggleButton } from "vue-js-toggle-button";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        ToggleButton,
    },
    data: () => ({
        internalText: "",
        renderPending: false,
        layerId: null,
    }),
    computed: {
        ...mapGetters([
            "selectionOptions",
        ]),
        maintainRatio: {
            get() {
                return this.selectionOptions.lockRatio;
            },
            set( value ) {
                this.setToolOptionValue({ tool: ToolTypes.SELECTION, option: "lockRatio", value });
            }
        },
        xRatio: {
            get() {
                return this.selectionOptions.xRatio;
            },
            set( value ) {
                this.setToolOptionValue({ tool: ToolTypes.SELECTION, option: "xRatio", value });
            }
        },
        yRatio: {
            get() {
                return this.selectionOptions.yRatio;
            },
            set( value ) {
                this.setToolOptionValue({ tool: ToolTypes.SELECTION, option: "yRatio", value });
            }
        }
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/tool-option";

.half {
    width: 20% !important;
    &:first-of-type {
        margin-right: $spacing-small;
    }
}
</style>
