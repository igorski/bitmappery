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
        <h3 v-t="'cloneBrush'"></h3>
        <div class="wrapper input">
            <label v-t="'sourceLayer'"></label>
            <select-box :options="selectableLayers"
                         v-model="sourceLayer"
            />
        </div>
        <div class="wrapper input">
            <label v-t="'brushSize'"></label>
            <slider
                v-model="brushSize"
                :min="1"
                :max="MAX_BRUSH_SIZE"
            />
        </div>
        <div class="wrapper input">
            <button
                v-t="'selectSourceCoordinate'"
                v-tooltip="'(Alt + Click)'"
                type="button"
                class="button button--small full"
                @click="resetSourceCoordinate"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import ToolTypes, { MAX_BRUSH_SIZE } from "@/definitions/tool-types";
import SelectBox from '@/components/ui/select-box/select-box';
import Slider from "@/components/ui/slider/slider";
import messages from "./messages.json";

let isSourceSelect = false;
let orgCoords = null;

export default {
    i18n: { messages },
    components: {
        SelectBox,
        Slider,
    },
    data: () => ({
        MAX_BRUSH_SIZE,
    }),
    computed: {
        ...mapGetters([
            "activeLayer",
            "layers",
            "cloneOptions",
        ]),
        selectableLayers() {
            return this.layers.filter(({ visible }) => visible )
                              .map( layer => ({ text: layer.name, value: layer.id }))
                              .reverse();
        },
        sourceLayer: {
            get() {
                return this.cloneOptions.source;
            },
            set( value ) {
                this.updateValue( "source", value );
            },
        },
        brushSize: {
            get() {
                return this.cloneOptions.size;
            },
            set( value ) {
                this.updateValue( "size", value );
            },
        },
    },
    created() {
        if ( !this.sourceLayer && this.activeLayer ) {
            this.sourceLayer = this.activeLayer.id;
        }
        this._handler = this.handleKeyDown.bind( this );
        window.addEventListener( "keydown", this._handler );
        window.addEventListener( "keyup",  this._handler );
    },
    destroyed() {
        window.removeEventListener( "keydown", this._handler );
        window.removeEventListener( "keyup",   this._handler );
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
        resetSourceCoordinate() {
            this.updateValue( "coords", null );
        },
        updateValue( option, value ) {
            this.setToolOptionValue({ tool: ToolTypes.CLONE, option, value });
        },
        handleKeyDown({ type, keyCode }) {
            if ( keyCode === 18 ) { // alt key
                switch ( type ) {
                    default:
                    case "keyup":
                        // when alt key is released and no new source coordinates
                        // were defined, revert to previously set coordinates (when exiting)
                        if ( !this.cloneOptions.coords ) {
                            this.updateValue( "coords", orgCoords );
                        }
                        break;
                    case "keydown":
                        // when alt key is held down, we store a reference to the current
                        // source coordinates (when existing) and reset the coordinates
                        // this will lead the layer-sprite to set new source coordinates on click
                        isSourceSelect = true;
                        orgCoords = this.cloneOptions.coords;
                        this.resetSourceCoordinate();
                        break;
                }
            }
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/options-panel";

.color-picker {
    width: 50%;
    display: inline-block;
    transform: translateY(-$spacing-xsmall);
}

.full {
    width: 100%;
}
</style>
