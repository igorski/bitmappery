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
    <div class="options-panel-wrapper">
        <h2 v-if="!collapsed" v-t="'optionsPanel'"></h2>
        <button
            type="button"
            class="close-button"
            @click="collapsed = !collapsed"
        >{{ collapsed ? '&larr;' : '&rarr;' }}</button>
        <div
            v-if="!collapsed"
            class="content form"
        >
            <!-- file import section -->
            <file-selector />
            <button
                v-if="!dropbox"
                v-t="'importFromDropbox'"
                type="button"
                class="button button--block dropbox"
                @click="dropbox = true"
            ></button>
            <component :is="cloudImportType" />
            <div class="wrapper input padded">
                <label v-t="'openAsNew'"></label>
                <select-box :options="fileTargetOptions"
                             v-model="importTarget"
                />
            </div>
            <!-- active tool section -->
            <component :is="activeToolOptions" />
            <!-- layer section -->
            <layers />
        </div>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import FileSelector from "./components/file-selector/file-selector";
import Layers       from "./components/layers/layers";
import SelectBox    from "@/components/ui/select-box/select-box";
import ToolTypes    from "@/definitions/tool-types";
import { mapSelectOptions } from "@/utils/search-select-util"
import messages     from "./messages.json";

export default {
    i18n: { messages },
    components: {
        FileSelector,
        Layers,
        SelectBox,
    },
    data: () => ({
        dropbox: false,
    }),
    computed: {
        ...mapState([
            "optionsPanelOpened",
        ]),
        ...mapGetters([
            "activeTool",
            "fileTarget",
        ]),
        collapsed: {
            get() {
                return !this.optionsPanelOpened;
            },
            set( value ) {
                this.setOptionsPanelOpened( !value );
            }
        },
        fileTargetOptions() {
            return mapSelectOptions([ "layer", "document" ]);
        },
        importTarget: {
            get() {
                return this.fileTarget;
            },
            set( value ) {
                this.setFileTarget( value );
            }
        },
        /**
         * Cloud import are loaded at runtime to omit packaging
         * third party SDK within the core bundle.
         */
        cloudImportType() {
            switch ( this.dropbox ) {
                default:
                    return null;
                case true:
                    return () => import( "./components/dropbox-connector/dropbox-connector" );
            }
        },
        activeToolOptions() {
            switch ( this.activeTool ) {
                default:
                    return null;
                case ToolTypes.ZOOM:
                    return () => import( "./components/tool-options-zoom/tool-options-zoom" );
                case ToolTypes.BRUSH:
                    return () => import( "./components/tool-options-brush/tool-options-brush" );
                case ToolTypes.ROTATE:
                    return () => import( "./components/tool-options-rotate/tool-options-rotate" );
            }
        },
    },
    methods: {
        ...mapMutations([
            "setOptionsPanelOpened",
            "setFileTarget",
        ]),
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";
@import "@/styles/third-party";

.options-panel-wrapper {
    @include component();
    overflow-y: auto;
    width: 100%;
    height: 100%;
}

.padded {
    margin: $spacing-small 0;
}
</style>
