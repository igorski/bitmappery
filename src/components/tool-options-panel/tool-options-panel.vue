/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
        class="options-panel-wrapper"
        :class="{ collapsed }"
    >
        <div class="component__header">
            <h2
                v-t="'toolOptions'"
                v-tooltip="'(Tab)'"
                class="component__title"
            ></h2>
            <button
                type="button"
                class="component__header-button button--ghost"
                @click="collapsed = !collapsed"
            >
                <img :src="`assets/images/icon-${collapsed ? 'expand' : 'collapse'}.svg`" />
            </button>
        </div>
        <div
            v-if="!collapsed"
            class="component__content form"
        >
            <!-- active tool section -->
            <p
                v-if="!activeToolOptions"
                v-t="'noToolOptions'"
                class="no-tools-text"
            ></p>
            <component v-else :is="activeToolOptions" />
        </div>
    </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import { mapState, mapGetters, mapMutations } from "vuex";
import { PANEL_TOOL_OPTIONS } from "@/definitions/panel-types";
import ToolTypes from "@/definitions/tool-types";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapState([
            "openedPanels",
        ]),
        ...mapGetters([
            "activeTool",
        ]),
        collapsed: {
            get() {
                return !this.openedPanels.includes( PANEL_TOOL_OPTIONS );
            },
            set() {
                this.setOpenedPanel( PANEL_TOOL_OPTIONS );
            }
        },
        /**
         * To cut down on initial bundle size, these components
         * are loaded asynchronously at runtime
         */
        activeToolOptions() {
            let loader;
            switch ( this.activeTool ) {
                default:
                    return null;
                case ToolTypes.DRAG:
                    loader = () => import( "./tool-options-drag/tool-options-drag.vue" );
                    break;
                case ToolTypes.SELECTION:
                case ToolTypes.LASSO:
                    loader =  () => import( "./tool-options-selection/tool-options-selection.vue" );
                    break;
                case ToolTypes.FILL:
                    loader =  () => import( "./tool-options-fill/tool-options-fill.vue" );
                    break;
                case ToolTypes.ZOOM:
                    loader =  () => import( "./tool-options-zoom/tool-options-zoom.vue" );
                    break;
                case ToolTypes.ERASER:
                    loader =  () => import( "./tool-options-eraser/tool-options-eraser.vue" );
                    break;
                case ToolTypes.BRUSH:
                    loader =  () => import( "./tool-options-brush/tool-options-brush.vue" );
                    break;
                case ToolTypes.CLONE:
                    loader =  () => import( "./tool-options-clone/tool-options-clone.vue" );
                    break;
                case ToolTypes.ROTATE:
                    loader =  () => import( "./tool-options-rotate/tool-options-rotate.vue" );
                    break;
                case ToolTypes.SCALE:
                    loader =  () => import( "./tool-options-scale/tool-options-scale.vue" );
                    break;
                case ToolTypes.MIRROR:
                    loader =  () => import( "./tool-options-mirror/tool-options-mirror.vue" );
                    break;
                case ToolTypes.TEXT:
                    loader =  () => import( "./tool-options-text/tool-options-text.vue" );
                    break;
                case ToolTypes.WAND:
                    loader =  () => import( "./tool-options-wand/tool-options-wand.vue" );
                    break;
            }
            return defineAsyncComponent({ loader });
        },
    },
    methods: {
        ...mapMutations([
            "setOpenedPanel",
        ]),
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/panel";

.options-panel-wrapper {
    @include panel.panel();
    overflow: initial !important;

    @include mixins.large() {
        &.collapsed {
            width: 100%;
            height: panel.$collapsed-panel-height !important;
        }
    }

    @include mixins.mobile() {
        position: fixed;
        bottom: panel.$collapsed-panel-height;
        height: 40%;

        &.collapsed {
            height: panel.$collapsed-panel-height;
        }
    }
}

.no-tools-text {
    margin-top: variables.$spacing-small;
}
</style>
