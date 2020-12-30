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
        <h3 v-t="'text'"></h3>
        <div class="wrapper input">
            <textarea
                v-model="text"
                class="full"
                @focus="handleTextFocus"
                @blur="handleTextBlur"
            />
        </div>
        <div class="wrapper input">
            <label v-t="'size'"></label>
            <slider
                v-model="size"
                :min="6"
                :max="172"
                :tooltip="'none'"
            />
        </div>
        <div class="wrapper input">
            <label v-t="'color'"></label>
            <component
                :is="colorPicker"
                v-model="color"
                v-tooltip="$t('color')"
                class="color-picker"
            />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import Slider from "@/components/ui/slider/slider";
import KeyboardService from "@/services/keyboard-service";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Slider,
    },
    computed: {
        ...mapGetters([
            "activeLayerIndex",
            "activeLayer",
        ]),
        colorPicker() {
            // load async as this adds to the bundle size
            return () => import( "@/components/ui/color-picker/color-picker" );
        },
        text: {
            get() {
                return this.activeLayer.text?.value;
            },
            set( value ) {
                this.updateLayer({
                    index: this.activeLayerIndex,
                    opts: { text: { value, size: this.size, font: "Arial", color: this.color } },
                });
                this.requestRender();
            }
        },
        size: {
            get() {
                return this.activeLayer.text?.size;
            },
            set( value ) {
                this.updateLayer({
                    index: this.activeLayerIndex,
                    opts: { text: { value: this.text, size: value, font: "Arial", color: this.color } },
                });
                this.requestRender();
            }
        },
        color: {
            get() {
                return this.activeLayer.text?.color;
            },
            set( value ) {
                this.updateLayer({
                    index: this.activeLayerIndex,
                    opts: { text: { value: this.text, size: this.size, font: "Arial", color: value } },
                });
                this.requestRender();
            }
        }
    },
    destroyed() {
        this.handleTextBlur();
    },
    methods: {
        ...mapMutations([
            "updateLayer",
        ]),
        handleTextFocus() {
            KeyboardService.setSuspended( true );
        },
        handleTextBlur() {
            KeyboardService.setSuspended( false );
        },
        requestRender() {
            getSpriteForLayer( this.activeLayer )?.cacheEffects();
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/options-panel";

.color-picker {
    width: 50%;
    display: inline-block;
    transform: translateY(-$spacing-xsmall);
}
</style>
