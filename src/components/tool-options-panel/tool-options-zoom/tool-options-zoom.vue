/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
        <h3 v-t="'zoomLevel'"></h3>
        <div class="wrapper full slider">
            <slider
                v-model="zoomLevel"
                :min="min"
                :max="max"
                :tooltip="'none'"
            />
        </div>
        <div class="actions">
            <button
                v-t="'bestFit'"
                type="button"
                class="button button--small"
                :disabled="!activeDocument"
                @click="setBestFit()"
            ></button>
            <button
                v-t="'fitWindow'"
                type="button"
                class="button button--small"
                :disabled="!activeDocument"
                @click="setFitWindow()"
            ></button>
            <button
                v-t="'original'"
                type="button"
                class="button button--small"
                :disabled="!activeDocument"
                @click="setOriginalSize()"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import Slider from "@/components/ui/slider/slider";
import ToolTypes, { MIN_ZOOM, MAX_ZOOM } from "@/definitions/tool-types";
import { fitInWindow, displayOriginalSize } from "@/utils/zoom-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Slider,
    },
    data: () => ({
        min: MIN_ZOOM,
        max: MAX_ZOOM,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "zoomOptions",
            "canvasDimensions",
        ]),
        zoomLevel: {
            get() {
                return this.zoomOptions.level;
            },
            set( value ) {
                this.setToolOptionValue({
                    tool: ToolTypes.ZOOM,
                    option: "level",
                    value
                });
            }
        }
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
        setBestFit() {
            this.zoomLevel = 0;
        },
        setFitWindow() {
            this.zoomLevel = fitInWindow( this.activeDocument, this.canvasDimensions );
        },
        setOriginalSize() {
            this.zoomLevel = displayOriginalSize( this.activeDocument, this.canvasDimensions );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/tool-option";
</style>
