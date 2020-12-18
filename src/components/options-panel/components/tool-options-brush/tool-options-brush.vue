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
        <h3 v-t="'brush'"></h3>
        <div class="wrapper input">
            <label v-t="'brushColor'"></label>
            <component
                :is="colorPicker"
                v-model="brushColor"
                class="color-picker"
            />
        </div>
        <div class="wrapper input">
            <label v-t="'brushSize'"></label>
            <slider
                v-model="brushSize"
                :min="1"
                :max="100"
            />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import ToolTypes     from "@/definitions/tool-types";
import DrawableLayer from "@/components/ui/zcanvas/drawable-layer";
import Slider        from "@/components/ui/slider/slider";
import { runSpriteFn } from "@/factories/sprite-factory";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Slider,
    },
    computed: {
        ...mapGetters([
            "brushOptions",
        ]),
        colorPicker() {
            // load async as this adds to the bundle size
            return () => import( "@/components/ui/color-picker/color-picker" );
        },
        brushColor: {
            get() {
                return this.brushOptions.color;
            },
            set( value ) {
                this.setToolOptionValue({
                    tool: ToolTypes.BRUSH,
                    option: "color",
                    value,
                });
                this.updateDrawableLayers();
            },
        },
        brushSize: {
            get() {
                return this.brushOptions.size;
            },
            set( value ) {
                this.setToolOptionValue({
                    tool: ToolTypes.BRUSH,
                    option: "size",
                    value,
                });
                this.updateDrawableLayers();
            },
        },
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
        updateDrawableLayers() {
            runSpriteFn( sprite => {
                if ( sprite instanceof DrawableLayer ) {
                    sprite.cacheGradient( this.brushColor, this.brushSize );
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/tool-option";
</style>
