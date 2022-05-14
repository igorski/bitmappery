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
    <div class="toolbox-wrapper">
        <div class="component__header">
            <h2
                v-if="!collapsed"
                v-t="'tools'"
                v-tooltip="'(Tab)'"
                class="component__title"
            ></h2>
            <button
                type="button"
                class="component__header-button button--ghost"
                @click="collapsed = !collapsed"
            >
                <img :src="`./assets/icons/icon-${collapsed ? 'expand' : 'collapse'}.svg`" />
            </button>
        </div>
        <!-- click.stop.prevent is to prevent document scroll on double tap on iOS -->
        <div
            v-if="!collapsed"
            class="component__content"
            @click.stop.prevent=""
        >
            <!-- background for --docked buttons (see mobile styles) -->
            <div class="toolbox-wrapper--docked"></div>
            <!-- history states -->
            <button
                type="button"
                v-tooltip="$t('undo')"
                class="tool-button tool-button--docked"
                :title="$t('undo')"
                :disabled="!canUndo"
                @click="undo()"
            >
                <img src="@/assets/icons/icon-history.svg" />
            </button>
            <button
                type="button"
                v-tooltip="$t('redo')"
                class="tool-button tool-button--docked tool-button--docked-second"
                :title="$t('redo')"
                :disabled="!canRedo"
                @click="redo()"
            >
                <img src="@/assets/icons/icon-history.svg" class="mirrored" />
            </button>
            <!-- tools -->
            <button
                v-for="tool in tools"
                :key="tool.type"
                type="button"
                v-tooltip="`${$t( tool.i18n )} (${tool.key})`"
                :title="$t( tool.i18n )"
                class="tool-button"
                :class="{
                    'active': activeTool === tool.type
                }"
                :disabled="tool.disabled"
                @click="handleToolClick( tool )"
            >
                <img :src="`./assets/icons/tool-${tool.icon}.svg`" />
            </button>
            <div class="wrapper input color-panel">
                <label v-t="'color'" class="color-panel__label"></label>
                <component
                    :is="colorPicker"
                    v-model="color"
                    v-tooltip="`${$t('color')} (C)`"
                    class="color-picker tool-button--docked tool-button--docked-color"
                />
            </div>
        </div>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import { LAYER_TEXT } from "@/definitions/layer-types";
import { PANEL_TOOL_OPTIONS } from "@/definitions/panel-types";
import { isMobile } from "@/utils/environment-util";
import { addTextLayer } from "@/utils/layer-util";
import ToolTypes, { canDraw } from "@/definitions/tool-types";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapState([
            "toolboxOpened",
            "openedPanels",
        ]),
        ...mapGetters([
            "activeTool",
            "activeDocument",
            "activeLayer",
            "activeColor",
            "activeToolOptions",
            "canUndo",
            "canRedo",
        ]),
        colorPicker() {
            // load async as this adds to the bundle size
            return () => import( "@/components/ui/color-picker/color-picker" );
        },
        collapsed: {
            get() {
                return !this.toolboxOpened;
            },
            set( value ) {
                this.setToolboxOpened( !value );
            }
        },
        tools() {
            const drawable = canDraw( this.activeDocument, this.activeLayer );
            const clonable = canDraw( this.activeDocument, this.activeLayer );
            return [
                {
                    type: ToolTypes.MOVE,
                    i18n: "panViewport", icon: "move", key: "P / Space + Drag",
                    disabled: !this.activeDocument, hasOptions: false
                },
                {
                    type: ToolTypes.DRAG,
                    i18n: "dragLayer", icon: "drag", key: "V",
                    disabled: !this.activeDocument, hasOptions: false
                },
                {
                    type: ToolTypes.SELECTION,
                    i18n: "rectangularSelection", icon: "selection", key: "M",
                    disabled: !this.activeDocument, hasOptions: false
                },
                {
                    type: ToolTypes.LASSO,
                    i18n: "polygonalLasso", icon: "lasso", key: "L",
                    disabled: !this.activeDocument, hasOptions: false
                },
                {
                    type: ToolTypes.FILL,
                    i18n: "paintBucket", icon: "fill", key: "G",
                    disabled: !drawable, hasOptions: false
                },
                {
                    type: ToolTypes.BRUSH,
                    i18n: "brush", icon: "paintbrush", key: "B",
                    disabled: !drawable, hasOptions: true
                },
                {
                    type: ToolTypes.ERASER,
                    i18n: "eraser", icon: "eraser", key: "E",
                    disabled: !drawable, hasOptions: true
                },
                {
                    type: ToolTypes.CLONE,
                    i18n: "cloneStamp", icon: "stamp", key: "S",
                    disabled: !clonable, hasOptions: true
                },
                {
                    type: ToolTypes.SCALE,
                    i18n: "scaleLayer", icon: "resize", key: "D",
                    disabled: !this.activeLayer, hasOptions: true,
                },
                {
                    type: ToolTypes.EYEDROPPER,
                    i18n: "eyedropper", icon: "eyedropper", key: "I",
                    disabled: !this.activeLayer, hasOptions: false
                },
                {
                    type: ToolTypes.MIRROR,
                    i18n: "mirrorLayer", icon: "mirror", key: "F",
                    disabled: !this.activeLayer, hasOptions: true
                },
                {
                    type: ToolTypes.ROTATE,
                    i18n: "rotateLayer", icon: "rotate", key: "R",
                    disabled: !this.activeLayer, hasOptions: true
                },
                {
                    type: ToolTypes.TEXT,
                    i18n: "text", icon: "text", key: "T",
                    disabled: !this.activeDocument, hasOptions: true
                },
                {
                    type: ToolTypes.ZOOM,
                    i18n: "zoom", icon: "zoom", key: "Z",
                    disabled: !this.activeDocument, hasOptions: true
                },
            ]
        },
        color: {
            get() {
                return this.activeColor;
            },
            set( value ) {
                this.setActiveColor( value );
            },
        },
    },
    watch: {
        activeLayer( layer ) {
            if ( !layer ) {
                return;
            }
            switch ( this.activeTool ) {
                default:
                    return;
                case ToolTypes.TEXT:
                    if ( layer.type !== LAYER_TEXT ) {
                        this.setTool( null );
                    }
                    break;
            }
        },
    },
    methods: {
        ...mapMutations([
            "addLayer",
            "setActiveTool",
            "setToolboxOpened",
            "setOpenedPanel",
            "setActiveColor",
        ]),
        ...mapActions([
            "undo",
            "redo",
        ]),
        handleToolClick({ type, hasOptions }) {
            this.setTool( type );
            // ensure that the tool options panel opens in case it was collapsed
            if ( isMobile() && hasOptions && !this.openedPanels.includes( PANEL_TOOL_OPTIONS )) {
                this.setOpenedPanel( PANEL_TOOL_OPTIONS );
            }
        },
        setTool( tool ) {
            if ( tool === ToolTypes.TEXT && this.activeLayer?.type !== LAYER_TEXT ) {
                addTextLayer( this.$store );
            }
            this.setActiveTool({ tool, document: this.activeDocument });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";
@import "@/styles/typography";

$toolButtonWidth: $spacing-large;

.toolbox-wrapper {
    @include component();

    @include large() {
        .component__content {
            margin-right: -$spacing-small;
            padding: $spacing-small + $spacing-xsmall;
        }

        .component__header-button {
            top: $spacing-small - $spacing-xxsmall;
            right: $spacing-xxsmall;
            width: 36px;
            height: 29px;

            img {
                width: $spacing-medium + $spacing-small;
                height: $spacing-medium + $spacing-small;
            }
        }

        &--docked {
            display: none;
        }
    }

    @include mobile() {
        // always expanded in mobile view (is small horizontal strip)
        overflow-y: hidden;
        overflow-x: auto;
        // the mobile view supports --docked buttons. these have a fixed position whereas
        // the remainder of the tools can scroll out of view. most-used buttons can be
        // docked to remain accessible at all times
        $dockedOffset: #{(($spacing-medium + $toolButtonWidth) * 3) + $spacing-small};
        margin-left: $dockedOffset;
        padding: 0 $dockedOffset 0 0;
        box-sizing: border-box;
        width: calc(100% - #{$dockedOffset});

        // faux-background for the --docked buttons (as these are fixed we are adding
        // a margin to the actual button container, upon scroll these buttons should
        // disappear below this background so they are occluded by the --docked buttons)
        &--docked {
            position: fixed;
            left: 0;
            width: $dockedOffset;
            height: $menu-height;
            padding-right: $spacing-xsmall;
            background-image: $color-window-bg;
        }

        .component__content {
            width: max-content;
            padding: $spacing-xsmall 0 $spacing-xxsmall $spacing-xsmall;
        }

        .component__header,
        .component__header-button,
        .color-panel__label {
            display: none;
        }
    }

    // tall screens

    @media screen and (min-height: 880px) {
        width: 60px !important;

        .component__title {
            display: none;
        }

        .component__header-button {
            top: $spacing-small;
            right: #{$spacing-medium - $spacing-xsmall};
        }

        .color-panel {
            &__label {
                display: none;
            }
            .color-picker {
                text-indent: $spacing-xsmall;
            }
        }
    }
}

.tool-button {
    cursor: pointer;
    border-radius: $spacing-xsmall;
    border: none;
    padding: $spacing-xxsmall $spacing-xsmall;
    font-weight: bold;
    background-color: $color-bg;
    @include customFont();

    img {
        width: $toolButtonWidth;
        height: $toolButtonWidth;
        vertical-align: middle;
        padding: $spacing-xxsmall 0;

        &.mirrored {
            transform: scale(-1, 1);
            transform-origin: center;
        }
    }

    &:hover,
    &.active {
        background-color: $color-1;
        color: #FFF;
    }

    &:disabled {
        background-color: #333;
        color: $color-bg;
        cursor: default;
    }

    @include large() {
        margin: 0 $spacing-small $spacing-small 0;
        display: inline-block;
    }

    @include mobile() {
        margin: 0 $spacing-small 0 0;
        display: inline;

        &--docked {
            position: fixed;
            left: $spacing-small;

            &-second {
                left: #{($spacing-small + $toolButtonWidth) + $spacing-medium};
            }

            &-color {
                left: #{(($spacing-small + $toolButtonWidth) * 2 ) + $spacing-large};

                :first-child {
                    margin-top: -#{$spacing-small + $spacing-xsmall};
                }
            }
        }
    }
}

.color-panel {
    vertical-align: middle;
    display: inline-flex;

    @include large() {
        border-top: 1px solid #444;
        margin-top: $spacing-small;
        padding-top: $spacing-medium - $spacing-xsmall;
    }

    &__label {
        margin: $spacing-xxsmall $spacing-small 0 $spacing-xxsmall;
        @include customFont();
        color: #FFF;
    }

    .color-picker {
        margin-top: -$spacing-xsmall;
    }
}

</style>
