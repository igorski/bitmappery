/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
            <label v-t="'brushType'"></label>
            <select-box
                v-model="brushType"
                :options="brushTypes"
                :disabled="disabled"
            />
        </div>
        <div class="wrapper slider">
            <label v-t="'brushSize'"></label>
            <slider
                v-model="brushSize"
                :min="1"
                :max="MAX_BRUSH_SIZE"
                :disabled="disabled"
            />
        </div>
        <div
            v-if="hasThickness"
            class="wrapper slider"
        >
            <label v-t="'thickness'"></label>
            <slider
                v-model="thickness"
                :min="0"
                :max="100"
                :disabled="disabled"
            />
        </div>
        <template v-if="canStroke">
            <div class="wrapper slider">
                <label v-t="'strokeAmount'"></label>
                <slider
                    v-model="strokes"
                    :min="1"
                    :max="5"
                    :disabled="disabled"
                />
            </div>
            <div class="wrapper input">
                <label v-t="'smoothing'"></label>
                <toggle-button
                    v-model="smooth"
                    sync
                    :disabled="disabled"
                />
            </div>
        </template>
        <div class="wrapper slider">
            <label v-t="'opacity'"></label>
            <slider
                v-model="opacity"
                :min="0"
                :max="100"
                :disabled="disabled"
            />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations }  from "vuex";
import ToolTypes, { MAX_BRUSH_SIZE, canDraw } from "@/definitions/tool-types";
import BrushTypes from "@/definitions/brush-types";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import Slider from "@/components/ui/slider/slider.vue";
import { ToggleButton } from "vue-js-toggle-button";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Slider,
        SelectBox,
        ToggleButton,
    },
    data: () => ({
        MAX_BRUSH_SIZE,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "activeLayer",
            "brushOptions",
        ]),
        disabled() {
            return !canDraw( this.activeDocument, this.activeLayer );
        },
        hasThickness() {
            return this.brushType === BrushTypes.PAINT_BRUSH;
        },
        canStroke() {
            return this.brushType === BrushTypes.PEN;
        },
        brushTypes() {
            return [
                { label: this.$t( "line" ),             value: BrushTypes.LINE },
                { label: this.$t( "paintBrush" ),       value: BrushTypes.PAINT_BRUSH },
                { label: this.$t( "pen" ),              value: BrushTypes.PEN },
                { label: this.$t( "calligraphic" ),     value: BrushTypes.CALLIGRAPHIC },
                { label: this.$t( "connectedPoints" ),  value: BrushTypes.CONNECTED },
            //    { label: this.$t( "nearestNeighbour" ), value: BrushTypes.NEAREST },
                { label: this.$t( "sprayCan" ),         value: BrushTypes.SPRAY }
            ];
        },
        brushType: {
            get() {
                return this.brushOptions.type;
            },
            set( value ) {
                this.update( "type", value );
            }
        },
        brushSize: {
            get() {
                return this.brushOptions.size;
            },
            set( value ) {
                this.update( "size", value );
            }
        },
        strokes: {
            get() {
                return this.brushOptions.strokes;
            },
            set( value ) {
                this.update( "strokes", value );
            }
        },
        smooth: {
            get() {
                return this.brushOptions.smooth;
            },
            set( value ) {
                this.update( "smooth", value );
            }
        },
        thickness: {
            get() {
                return this.brushOptions.thickness * 100;
            },
            set( value ) {
                this.update( "thickness", value / 100 );
            }
        },
        opacity: {
            get() {
                return this.brushOptions.opacity * 100;
            },
            set( value ) {
                this.update( "opacity", value / 100 );
            },
        },
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
        update( option, value ) {
            this.setToolOptionValue({
                tool: ToolTypes.BRUSH,
                option,
                value,
            });
        }
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/tool-option";
</style>
