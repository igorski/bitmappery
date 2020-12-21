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
    <div class="toolbox-wrapper">
        <h2 v-if="!collapsed" v-t="'toolbox'"></h2>
        <button
            type="button"
            class="close-button"
            @click="collapsed = !collapsed"
        >{{ collapsed ? '&rarr;' : '&larr;' }}</button>
        <div
            v-if="!collapsed"
            class="content"
        >
            <button v-for="(button, index) in tools"
                    :key="button.type"
                    v-t="button.i18n"
                    class="tool-button"
                    :class="{
                        'active': activeTool === button.type
                    }"
                    :disabled="button.disabled"
                    @click="setTool( button.type )"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import { LAYER_GRAPHIC, LAYER_MASK } from "@/definitions/layer-types";
import ToolTypes from "@/definitions/tool-types";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapState([
            "toolboxOpened",
        ]),
        ...mapGetters([
            "activeTool",
            "activeDocument",
            "activeLayer",
        ]),
        collapsed: {
            get() {
                return !this.toolboxOpened;
            },
            set( value ) {
                this.setToolboxOpened( !value );
            }
        },
        tools() {
            return [
                { type: ToolTypes.MOVE,  i18n: "move",  disabled: !this.activeDocument },
                { type: ToolTypes.ZOOM,  i18n: "zoom",  disabled: !this.activeDocument },
                { type: ToolTypes.BRUSH, i18n: "brush", disabled: !this.activeDocument || !( this.activeLayer?.mask || this.activeLayer.type === LAYER_GRAPHIC ) }
            ]
        },
    },
    watch: {
        activeDocument( document ) {
            if ( !document ) {
                this.setTool( null );
            }
        },
        activeLayer( layer ) {
            if ( !layer ) {
                return;
            }
            switch ( layer.type ) {
                default:
                    // brushing only allowed on graphic type layers
                    if ( this.activeTool === ToolTypes.BRUSH ) {
                        this.setTool( ToolTypes.MOVE );
                    }
                    break;
                case LAYER_GRAPHIC:
                    break;
            }
        },
    },
    methods: {
        ...mapMutations([
            "setActiveTool",
            "setToolboxOpened",
        ]),
        setTool( tool ) {
            this.setActiveTool({ tool, activeLayer: this.activeLayer });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";
@import "@/styles/typography";

.toolbox-wrapper {
    @include component();
}

.tool-button {
    margin: $spacing-small;
    cursor: pointer;
    border-radius: $spacing-xsmall;
    border: none;
    padding: $spacing-medium;
    font-weight: bold;
    @include customFont();

    &:hover,
    &.active {
        background-color: $color-1;
        color: #FFF;
    }

    &:disabled {
        background-color: #444;
        color: #666;
    }
}
</style>
