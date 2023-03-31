/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
        <p v-t="'mergeDescr'"></p>
        <template v-if="!isLassoSelection">
            <div class="wrapper input">
                <label v-t="'lockedRatio'" v-tooltip="$t('shiftKey')"></label>
                <toggle-button
                    v-model="maintainRatio"
                    name="ratio"
                    sync
                    :disabled="!activeLayer"
                />
            </div>
            <div class="wrapper input">
                <label v-t="'widthToHeight'"></label>
                <input
                    type="number"
                    v-model.number="xRatio"
                    class="input-field half"
                    :disabled="!activeLayer || !maintainRatio"
                />
                <input
                    type="number"
                    v-model.number="yRatio"
                    class="input-field half"
                    :disabled="!activeLayer || !maintainRatio"
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
                    :disabled="!hasSelection || hasMultipleShapes"
                />
                <input
                    type="number"
                    v-model.number="height"
                    class="input-field half"
                    :min="1"
                    :max="maxHeight"
                    :disabled="!hasSelection || hasMultipleShapes"
                />
            </div>
        </template>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import { ToggleButton } from "vue-js-toggle-button";
import ToolTypes from "@/definitions/tool-types";
import type { Rectangle } from "@/definitions/document";
import { getCanvasInstance } from "@/factories/sprite-factory";
import { translatePoints } from "@/math/point-math";
import KeyboardService from "@/services/keyboard-service";
import { selectionToRectangle } from "@/utils/selection-util";

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
            "activeDocument",
            "activeLayer",
            "activeTool",
            "hasSelection",
            "selectionOptions",
        ]),
        maintainRatio: {
            get(): boolean {
                return this.selectionOptions.lockRatio;
            },
            set( value: boolean ): void {
                this.setToolOptionValue({ tool: ToolTypes.SELECTION, option: "lockRatio", value });
            }
        },
        xRatio: {
            get(): number {
                return this.selectionOptions.xRatio;
            },
            set( value: number ): void {
                this.setToolOptionValue({ tool: ToolTypes.SELECTION, option: "xRatio", value });
            }
        },
        yRatio: {
            get(): number {
                return this.selectionOptions.yRatio;
            },
            set( value: number ): void {
                this.setToolOptionValue({ tool: ToolTypes.SELECTION, option: "yRatio", value });
            }
        },
        /* existing selection coordinates */
        x: {
            get(): number {
                return Math.round( this.cachedSelectionBounds.left );
            },
            set( value: number ): void {
                if ( isNaN( value )) {
                    return;
                }
                this.moveSelection( value - this.x );
            }
        },
        y: {
            get(): number {
                return Math.round( this.cachedSelectionBounds.top );
            },
            set( value: number ): void {
                if ( isNaN( value )) {
                    return;
                }
                this.moveSelection( 0, value - this.y );
            }
        },
        width: {
            get(): number {
                return Math.round( this.cachedSelectionBounds.width );
            },
            set( value: number ): void {
                if ( isNaN( value )) {
                    return;
                }
                this.adjustSelectionSize( Math.min( this.maxWidth - this.x, Math.abs( value )), this.height );
            }
        },
        height: {
            get(): number {
                return Math.round( this.cachedSelectionBounds.height );
            },
            set( value: number ): void {
                if ( isNaN( value )) {
                    return;
                }
                this.adjustSelectionSize( this.width, Math.min( this.maxHeight - this.y, Math.abs( value )));
            }
        },
        cachedSelectionBounds(): Rectangle {
            if ( !this.hasSelection ) {
                return { left: 0, top: 0, width: 0, height: 0 };
            }
            return selectionToRectangle( this.activeDocument.activeSelection );
        },
        isLassoSelection(): boolean {
            return this.activeTool === ToolTypes.LASSO;
        },
        hasMultipleShapes(): boolean {
            return this.activeDocument.activeSelection.length > 1;
        },
    },
    created(): void {
        this.maxWidth  = this.activeDocument.width - 1;
        this.maxHeight = this.activeDocument.height - 1;
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
        handleFocus(): void {
            KeyboardService.setSuspended( true );
        },
        handleBlur(): void {
            KeyboardService.setSuspended( false );
        },
        moveSelection( deltaX = 0, deltaY = 0 ): void {
            getCanvasInstance()?.interactionPane.setSelection(
                this.activeDocument.activeSelection.map( shape => translatePoints( shape, deltaX, deltaY )
            ), true );
        },
        adjustSelectionSize( newWidth = 1, newHeight = 1 ): void {
            const wider  = newWidth  >= this.width;
            const taller = newHeight >= this.height;
            const maxX   = this.x + newWidth;
            const maxY   = this.y + newHeight;
            const prevRight = this.x + this.width;
            const prevBottom = this.y + this.height;

            getCanvasInstance()?.interactionPane.setSelection(
                this.activeDocument.activeSelection.map( shape => shape.map(({ x, y }) => ({
                    x: wider  && x === prevRight  ? Math.max( maxX, x ) : Math.min( maxX, x ),
                    y: taller && y === prevBottom ? Math.max( maxY, y ) : Math.min( maxY, y ),
                }))), true
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
