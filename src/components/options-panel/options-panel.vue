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
    <div class="options-panel-wrapper">
        <h2
            v-if="!collapsed"
            v-t="'optionsPanel'"
            v-tooltip="'(Tab)'"
        ></h2>
        <button
            type="button"
            class="close-button button--ghost"
            @click="collapsed = !collapsed"
        >
            <img :src="`./assets/icons/icon-${collapsed ? 'expand' : 'collapse'}.svg`" />
        </button>
        <div
            v-if="!collapsed"
            class="content form"
        >
            <!-- active tool section -->
            <component :is="activeToolOptions" />
            <!-- layer section -->
            <layers />
        </div>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import Layers    from "./layers/layers";
import ToolTypes from "@/definitions/tool-types";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Layers,
    },
    computed: {
        ...mapState([
            "optionsPanelOpened",
        ]),
        ...mapGetters([
            "activeTool",
        ]),
        collapsed: {
            get() {
                return !this.optionsPanelOpened;
            },
            set( value ) {
                this.setOptionsPanelOpened( !value );
            }
        },
        activeToolOptions() {
            switch ( this.activeTool ) {
                default:
                    return null;
                case ToolTypes.ZOOM:
                    return () => import( "./tool-options-zoom/tool-options-zoom" );
                case ToolTypes.ERASER:
                    return () => import( "./tool-options-eraser/tool-options-eraser" );
                case ToolTypes.BRUSH:
                    return () => import( "./tool-options-brush/tool-options-brush" );
                case ToolTypes.CLONE:
                    return () => import( "./tool-options-clone/tool-options-clone" );
                case ToolTypes.ROTATE:
                    return () => import( "./tool-options-rotate/tool-options-rotate" );
                case ToolTypes.SCALE:
                    return () => import( "./tool-options-scale/tool-options-scale" );
                case ToolTypes.MIRROR:
                    return () => import( "./tool-options-mirror/tool-options-mirror" );
                case ToolTypes.TEXT:
                    return () => import( "./tool-options-text/tool-options-text" );
            }
        },
    },
    methods: {
        ...mapMutations([
            "setOptionsPanelOpened",
        ]),
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";

.options-panel-wrapper {
    @include component();
    overflow-y: auto;
    width: 100%;
    height: 100%;

    @include mobile() {
        overflow: hidden;

        .content {
            max-height: calc(100% - #{$heading-height});
            overflow-x: hidden;
            overflow-y: auto;
            padding: $spacing-small $spacing-medium;
        }
    }

    .close-button {
        top: $spacing-small - $spacing-xxsmall;
        right: $spacing-xxsmall;
        width: 36px;
        height: 29px;

        img {
            width: $spacing-medium + $spacing-small;
            height: $spacing-medium + $spacing-small;
        }
    }
}

.padded {
    margin: $spacing-small 0;
}
</style>
