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
    <div id="app">
        <application-menu />
        <section class="main">
            <toolbox
                ref="toolbox"
                class="toolbox"
                :class="{ 'collapsed': !toolboxOpened }"
            />
            <div
                class="document-container"
                :style="{ 'width': docWidth }"
            >
                <document-canvas ref="documentCanvas" />
            </div>
            <options-panel
                ref="optionsPanel"
                class="options-panel"
                :class="{ 'collapsed': !optionsPanelOpened }"
            />
        </section>
        <!-- dialog window used for information messages, alerts and confirmations -->
        <dialog-window v-if="dialog"
            :type="dialog.type"
            :title="dialog.title"
            :message="dialog.message"
            :confirm-handler="dialog.confirm"
            :cancel-handler="dialog.cancel"
        />
        <!-- overlays -->
        <div v-if="blindActive" class="blind">
            <component
                :is="activeModal"
                @close="closeModal()"
            />
        </div>
        <loader v-if="isLoading" />
        <!-- notifications -->
        <notifications />
    </div>
</template>

<script>
import Vuex, { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import Vue             from "vue";
import VueI18n         from "vue-i18n";
import VTooltip        from "v-tooltip";
import ApplicationMenu from "@/components/application-menu/application-menu";
import DocumentCanvas  from "@/components/document-canvas/document-canvas";
import OptionsPanel    from "@/components/options-panel/options-panel";
import Toolbox         from "@/components/toolbox/toolbox";
import DialogWindow    from "@/components/dialog-window/dialog-window";
import Notifications   from "@/components/notifications/notifications";
import Loader          from "@/components/loader/loader";
import { isMobile }    from "@/utils/environment-util";
import ToolTypes       from "@/definitions/tool-types";
import store           from "./store";
import messages        from "./messages.json";
import {
    CREATE_DOCUMENT, RESIZE_DOCUMENT, EXPORT_DOCUMENT, SAVE_DROPBOX_DOCUMENT, EXPORT_IMAGE,
    DROPBOX_FILE_SELECTOR, ADD_LAYER, LAYER_FILTERS, LOAD_SELECTION, SAVE_SELECTION
} from "@/definitions/modal-windows";

Vue.use( Vuex );
Vue.use( VueI18n );
Vue.use( VTooltip, { defaultDelay: 500 });

// Create VueI18n instance with options
const i18n = new VueI18n({
    messages
});

export default {
    i18n,
    store: new Vuex.Store( store ),
    components: {
        ApplicationMenu,
        DialogWindow,
        DocumentCanvas,
        Loader,
        Notifications,
        OptionsPanel,
        Toolbox,
    },
    data: () => ({
        docWidth: "100%",
    }),
    computed: {
        ...mapState([
            "blindActive",
            "toolboxOpened",
            "optionsPanelOpened",
            "dialog",
            "modal",
            "windowSize",
        ]),
        ...mapGetters([
            "activeDocument",
            "isLoading",
        ]),
        activeModal() {
            switch ( this.modal ) {
                default:
                    return null;
                case CREATE_DOCUMENT:
                    return () => import( "@/components/file-menu/create-document/create-document" );
                case RESIZE_DOCUMENT:
                    return () => import( "@/components/edit-menu/resize-document/resize-document" );
                case EXPORT_DOCUMENT:
                    return () => import( "@/components/file-menu/export-document/export-document" );
                case EXPORT_IMAGE:
                    return () => import( "@/components/file-menu/export-image/export-image" );
                case DROPBOX_FILE_SELECTOR:
                    return () => import( "@/components/dropbox-file-selector/dropbox-file-selector" );
                case SAVE_DROPBOX_DOCUMENT:
                    return () => import( "@/components/file-menu/save-dropbox-document/save-dropbox-document" );
                case ADD_LAYER:
                    return () => import( "@/components/options-panel/add-layer/add-layer" );
                case LAYER_FILTERS:
                    return () => import( "@/components/options-panel/layer-filters/layer-filters" );
                case LOAD_SELECTION:
                    return () => import( "@/components/selection-menu/load-selection/load-selection" );
                case SAVE_SELECTION:
                    return () => import( "@/components/selection-menu/save-selection/save-selection" );
            }
        },
    },
    watch: {
        toolboxOpened() {
            this.$nextTick( this.scaleContainer );
        },
        optionsPanelOpened() {
            this.$nextTick( this.scaleContainer );
        },
    },
    async created() {
        await this.setupServices( i18n );
        // no need to remove the below as we will require it throughout the application lifetime
        window.addEventListener( "resize", this.handleResize.bind( this ));
        if ( process.env.NODE_ENV !== "development" ) {
            window.onbeforeunload = e => this.activeDocument ? () => this.$t( "warningUnload" ) : true;
        }
        this.setToolboxOpened( true );
        this.setOptionsPanelOpened( !isMobile() );
    },
    methods: {
        ...mapMutations([
            "setWindowSize",
            "closeModal",
            "setToolboxOpened",
            "setOptionsPanelOpened",
            "setToolOptionValue",
        ]),
        ...mapActions([
            "setupServices",
        ]),
        handleResize() {
            this.setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            // prevent maximum zoom at previous small window size to lead to excessively large document canvas
            this.setToolOptionValue({ tool: ToolTypes.ZOOM, option: "level", value: 1 });
        },
        /**
         * Ensure the document container has optimal size. Ideally we'd like a pure
         * CSS solution, but the toolbox and options panel widths are dynamic (and
         * in both cases fixed), making flexbox cumbersome.
         */
        scaleContainer() {
            if ( isMobile() ) {
                return;
            }
            const toolboxWidth      = this.$refs.toolbox?.$el.clientWidth;
            const optionsPanelWidth = this.$refs.optionsPanel?.$el.clientWidth;
            this.docWidth = `calc(100% - ${toolboxWidth + optionsPanelWidth + 32}px)`;
            this.$nextTick(() => this.$refs.documentCanvas?.calcIdealDimensions());
        },
    }
};
</script>

<style lang="scss">
/**
 * note child components use scoped styling
 * here we set the global typography and layout styles
 * we expect to use throughout
 */
@import "@/styles/_mixins";
@import "@/styles/ui";
@import "@/styles/form";
@import "@/styles/typography";
@import "@/styles/tooltip";

html, body {
    margin: 0;
    height: 100%;
    overflow: hidden;
    overscroll-behavior-x: none; /* disable navigation back/forward swipe on Chrome */
}
#app {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-image: linear-gradient(to bottom, #282828 35%, #383838 90%);
    height: 100%;
    @include noSelect();

    .main {
        @include boxSize();
        height: calc(100% - #{$menu-height});
        position: relative;

        @include large() {
            padding: $spacing-medium;
        }
    }

    .blind {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,.5);
        z-index: 400; // below overlays (see _variables.scss)
    }

    .document-container {
        width: 100%;
        margin: 0 $spacing-medium;
    }

    /* three column layout on tablet / desktops */

    @include large() {
        .toolbox,
        .document-container,
        .options-panel {
            display: inline-block;
            vertical-align: top;
        }
        .toolbox,
        .options-panel {
            &.collapsed {
                width: $heading-height;
                min-height: $heading-height;
            }
        }

        .toolbox {
            width: 113px;
        }
        .options-panel {
            width: 300px;
        }
    }

    /* three row layout on phones */

    @include mobile() {
        .toolbox {
            position: fixed;
            top: $menu-height;
            width: 100%;
            height: $menu-height;
        }
        .options-panel {
            position: fixed;
            width: 100%;
            max-height: 33%;
            //max-height: calc(100% - #{$menu-height * 3});
            bottom: 0;

            &.collapsed {
                height: $menu-height;
            }
        }
        .document-container {
            position: fixed;
            top: $menu-height * 2;
            width: 100%;
            height: calc(100% - #{$menu-height * 3 });
            margin: 0;
        }
    }
}
</style>
