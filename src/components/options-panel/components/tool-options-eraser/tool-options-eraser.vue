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
    <div class="tool-option">
        <h3 v-t="'eraser'"></h3>
        <div class="wrapper input">
            <label v-t="'eraserSize'"></label>
            <slider
                v-model="eraserSize"
                :min="1"
                :max="MAX_BRUSH_SIZE"
            />
        </div>
        <div class="wrapper input">
            <label v-t="'opacity'"></label>
            <slider
                v-model="opacity"
                :min="0"
                :max="100"
            />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations }  from "vuex";
import ToolTypes, { MAX_BRUSH_SIZE } from "@/definitions/tool-types";
import Slider   from "@/components/ui/slider/slider";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Slider,
    },
    data: () => ({
        MAX_BRUSH_SIZE,
    }),
    computed: {
        ...mapGetters([
            "eraserOptions",
        ]),
        opacity: {
            get() {
                return this.eraserOptions.opacity * 100;
            },
            set( value ) {
                this.setToolOptionValue({
                    tool: ToolTypes.ERASER,
                    option: "opacity",
                    value: value / 100,
                });
            },
        },
        eraserSize: {
            get() {
                return this.eraserOptions.size;
            },
            set( value ) {
                this.setToolOptionValue({
                    tool: ToolTypes.ERASER,
                    option: "size",
                    value,
                });
            },
        },
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/tool-option";
</style>
