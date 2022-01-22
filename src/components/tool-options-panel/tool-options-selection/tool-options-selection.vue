/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2022 - https://www.igorski.nl
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
        <h3 v-t="'selection'"></h3>
        <template v-if="!isLassoSelection">
            <div class="wrapper input">
                <label v-t="'lockedRatio'" v-tooltip="$t('shiftKey')"></label>
                <toggle-button
                    v-model="maintainRatio"
                    name="ratio"
                    sync
                />
            </div>
            <div class="wrapper input">
                <label v-t="'widthToHeight'"></label>
                <input
                    type="number"
                    v-model.number="xRatio"
                    class="input-field half"
                    :disabled="!maintainRatio"
                />
                <input
                    type="number"
                    v-model.number="yRatio"
                    class="input-field half"
                    :disabled="!maintainRatio"
                />
            </div>
        </template>
        <p v-t="'existingSelection'"></p>
        <div class="wrapper input">
            <label v-t="'coordinates'"></label>
            <input
                type="number"
                v-model.number="x"
                class="input-field half"
                :min="-maxWidth"
                :max="maxWidth"
                :disabled="!hasSelection"
            />
            <input
                type="number"
                v-model.number="y"
                class="input-field half"
                :min="-maxHeight"
                :max="maxHeight"
                :disabled="!hasSelection"
            />
        </div>
        <template v-if="!isLassoSelection">
            <div class="wrapper input">
                <label v-t="'dimensions'"></label>
                <input
                    type="number"
                    v-model.number="width"
                    class="input-field half"
                    :min="1"
                    :max="maxWidth"
                    :disabled="!hasSelection"
                />
                <input
                    type="number"
                    v-model.number="height"
                    class="input-field half"
                    :min="1"
                    :max="maxHeight"
                    :disabled="!hasSelection"
                />
            </div>
        </template>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import { ToggleButton } from "vue-js-toggle-button";
import ToolTypes from "@/definitions/tool-types";
import KeyboardService from "@/services/keyboard-service";
import { getCanvasInstance } from "@/factories/sprite-factory";

import messages from "./messages.json";

const clamp = value => value === Infinity ? 1 : value === -Infinity ? 0 : value;

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
            "activeDocument",
            "activeTool",
            "hasSelection",
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
        },
        /* existing selection coordinates */
        x: {
            get() {
                return Math.round( this.cachedSelectionBounds.x );
            },
            set( value ) {
                if ( isNaN( value )) {
                    return;
                }
                this.moveSelection( value - this.x );
            }
        },
        y: {
            get() {
                return Math.round( this.cachedSelectionBounds.y );
            },
            set( value ) {
                if ( isNaN( value )) {
                    return;
                }
                this.moveSelection( 0, value - this.y );
            }
        },
        width: {
            get() {
                return Math.round( this.cachedSelectionBounds.width );
            },
            set( value ) {
                if ( isNaN( value )) {
                    return;
                }
                this.adjustSelectionSize( Math.min( this.maxWidth - this.x, Math.abs( value )), this.height );
            }
        },
        height: {
            get() {
                return Math.round( this.cachedSelectionBounds.height );
            },
            set( value ) {
                if ( isNaN( value )) {
                    return;
                }
                this.adjustSelectionSize( this.width, Math.min( this.maxHeight - this.y, Math.abs( value )));
            }
        },
        cachedSelectionBounds() {
            if ( !this.hasSelection ) {
                return { x: 0, y: 0, width: 0, height: 0 };
            }
            let x = Infinity;
            let y = Infinity;
            let r = -Infinity;
            let b = -Infinity;
            this.activeDocument.selection.forEach( point => {
                x = point.x < x ? point.x : x;
                y = point.y < y ? point.y : y;
                r = point.x > r ? point.x : r;
                b = point.y > b ? point.y : b;
            });
            return {
                x      : clamp( x ),
                y      : clamp( y ),
                width  : clamp( r - x ),
                height : clamp( b - y )
            };
        },
        isLassoSelection() {
            return this.activeTool === ToolTypes.LASSO;
        },
    },
    created() {
        this.maxWidth  = this.activeDocument.width - 1;
        this.maxHeight = this.activeDocument.height - 1;
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
        handleFocus() {
            KeyboardService.setSuspended( true );
        },
        handleBlur() {
            KeyboardService.setSuspended( false );
        },
        moveSelection( deltaX = 0, deltaY = 0 ) {
            getCanvasInstance()?.interactionPane.setSelection(
                this.activeDocument.selection.map(({ x, y }) => ({
                    x: x + deltaX,
                    y: y + deltaY
                })), true
            );
        },
        adjustSelectionSize( newWidth = 1, newHeight = 1 ) {
            const wider  = newWidth  >= this.width;
            const taller = newHeight >= this.height;
            const maxX   = this.x + newWidth;
            const maxY   = this.y + newHeight;
            const prevRight = this.x + this.width;
            const prevBottom = this.y + this.height;

            getCanvasInstance()?.interactionPane.setSelection(
                this.activeDocument.selection.map(({ x, y }) => ({
                    x: wider  && x === prevRight  ? Math.max( maxX, x ) : Math.min( maxX, x ),
                    y: taller && y === prevBottom ? Math.max( maxY, y ) : Math.min( maxY, y ),
                })), true
            );
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/tool-option";

.half {
    width: 30% !important;
    &:first-of-type {
        margin-right: $spacing-small;
    }
}
</style>
