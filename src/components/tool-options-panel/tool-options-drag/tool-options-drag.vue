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
    <div
        class="tool-option"
        @focusin="handleFocus"
        @focusout="handleBlur"
    >
        <h3 v-t="'layerPosition'"></h3>
        <div class="wrapper input">
            <label v-t="'coordinates'"></label>
            <input
                type="number"
                v-model.number="left"
                class="input-field half"
                :min="-maxWidth"
                :max="maxWidth"
                :disabled="!activeLayer"
            />
            <input
                type="number"
                v-model.number="top"
                class="input-field half"
                :min="-maxHeight"
                :max="maxHeight"
                :disabled="!activeLayer"
            />
        </div>
    </div>
</template>

<script>
import { mapGetters } from "vuex";
import KeyboardService from "@/services/keyboard-service";
import { getSpriteForLayer } from "@/factories/sprite-factory";

import messages from "./messages.json";

export default {
    i18n: { messages },
    data: () => ({
        internalText: "",
        renderPending: false,
        layerId: null,
    }),
    computed: {
        ...mapGetters([
            "activeLayer",
        ]),
        left: {
            get() {
                return Math.round( this.activeLayer?.left || 0 );
            },
            set( value ) {
                if ( isNaN( value )) {
                    return;
                }
                this.setLayerPosition( value, this.top );
            }
        },
        top: {
            get() {
                return Math.round( this.activeLayer?.top || 0 );
            },
            set( value ) {
                if ( isNaN( value )) {
                    return;
                }
                this.setLayerPosition( this.left, value );
            }
        },
        maxWidth() {
            return this.activeLayer?.width || 0;
        },
        maxHeight() {
            return this.activeLayer?.height || 0;
        }
    },
    methods: {
        handleFocus() {
            KeyboardService.setSuspended( true );
        },
        handleBlur() {
            KeyboardService.setSuspended( false );
        },
        setLayerPosition( x = this.top, y = this.left ) {
            getSpriteForLayer( this.activeLayer )?.setBounds( x, y );
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_variables";
@use "@/styles/tool-option";

.half {
    width: 30% !important;
    &:first-of-type {
        margin-right: variables.$spacing-small;
    }
}
</style>
