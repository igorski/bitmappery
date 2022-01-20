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
                <component :is="documentCanvas" ref="documentCanvas" />
            </div>
            <div
                ref="panels"
                class="panels"
                :class="{ 'collapsed': !openedPanels.length }"
            >
                <tool-options-panel
                    class="tool-options-panel"
                />
                <layer-panel
                    class="layer-panel"
                />
            </div>
        </section>
        <!-- dialog window used for information messages, alerts and confirmations -->
        <dialog-window
            v-if="dialog"
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
        <loader v-if="showLoader" />
        <!-- notifications -->
        <notifications />
    </div>
</template>

<script>
import Vuex, { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import Vue from "vue";
import VueI18n from "vue-i18n";
import VTooltip from "v-tooltip";
import ApplicationMenu from "@/components/application-menu/application-menu";
import ToolOptionsPanel from "@/components/tool-options-panel/tool-options-panel";
import LayerPanel from "@/components/layer-panel/layer-panel";
import Toolbox from "@/components/toolbox/toolbox";
import DialogWindow from "@/components/dialog-window/dialog-window";
import Notifications from "@/components/notifications/notifications";
import Loader from "@/components/loader/loader";
import DocumentFactory from "@/factories/document-factory";
import { isMobile } from "@/utils/environment-util";
import { loadImageFiles } from "@/services/file-loader-queue";
import { renderState } from "@/services/render-service";
import ImageToDocumentManager from "@/mixins/image-to-document-manager";
import { readClipboardFiles, readDroppedFiles } from "@/utils/file-util";
import ToolTypes from "@/definitions/tool-types";
import store from "./store";
import messages from "./messages.json";
import {
    CREATE_DOCUMENT, RESIZE_DOCUMENT, EXPORT_DOCUMENT, SAVE_DROPBOX_DOCUMENT, EXPORT_IMAGE,
    DROPBOX_FILE_SELECTOR, ADD_LAYER, LOAD_SELECTION, SAVE_SELECTION, PREFERENCES, RESIZE_CANVAS,
    GRID_TO_LAYERS
} from "@/definitions/modal-windows";

Vue.use( Vuex );
Vue.use( VueI18n );
Vue.use( VTooltip, { defaultDelay: 500 });

// Create VueI18n instance with options
const i18n = new VueI18n({
    messages
});
let lastDocumentId = null;

export default {
    i18n,
    store: new Vuex.Store( store ),
    mixins: [ ImageToDocumentManager ],
    components: {
        ApplicationMenu,
        DialogWindow,
        Loader,
        Notifications,
        ToolOptionsPanel,
        LayerPanel,
        Toolbox,
    },
    data: () => ({
        docWidth: "100%",
    }),
    computed: {
        ...mapState([
            "blindActive",
            "toolboxOpened",
            "openedPanels",
            "dialog",
            "modal",
            "windowSize",
        ]),
        ...mapGetters([
            "activeDocument",
            "isLoading",
        ]),
        documentCanvas() {
            return () => import( "@/components/document-canvas/document-canvas" );
        },
        activeModal() {
            switch ( this.modal ) {
                default:
                    return null;
                case CREATE_DOCUMENT:
                    return () => import( "@/components/file-menu/create-document/create-document" );
                case RESIZE_DOCUMENT:
                    return () => import( "@/components/resize-document-window/resize-document-window" );
                case EXPORT_DOCUMENT:
                    return () => import( "@/components/file-menu/export-document/export-document" );
                case EXPORT_IMAGE:
                    return () => import( "@/components/file-menu/export-image/export-image" );
                case DROPBOX_FILE_SELECTOR:
                    return () => import( "@/components/dropbox-file-selector/dropbox-file-selector" );
                case SAVE_DROPBOX_DOCUMENT:
                    return () => import( "@/components/file-menu/save-dropbox-document/save-dropbox-document" );
                case ADD_LAYER:
                    return () => import( "@/components/new-layer-window/new-layer-window" );
                case LOAD_SELECTION:
                    return () => import( "@/components/selection-menu/load-selection/load-selection" );
                case SAVE_SELECTION:
                    return () => import( "@/components/selection-menu/save-selection/save-selection" );
                case PREFERENCES:
                    return () => import( "@/components/preferences/preferences" );
                case RESIZE_CANVAS:
                    return () => import( "@/components/resize-canvas-window/resize-canvas-window" );
                case GRID_TO_LAYERS:
                    return () => import( "@/components/grid-to-layers-window/grid-to-layers-window" );
            }
        },
        showLoader() {
            return this.isLoading || renderState.pending > 0;
        },
    },
    watch: {
        activeDocument( document ) {
            if ( !document?.layers ) {
                this.resetHistory();
                if ( isMobile() ) {
                    this.closeOpenedPanels();
                }
            } else {
                const { id } = document;
                if ( id !== lastDocumentId ) {
                    lastDocumentId = id;
                    this.resetHistory();
                }
            }
        },
        toolboxOpened() {
            this.$nextTick( this.scaleContainer );
        },
        openedPanels() {
            this.$nextTick( this.scaleContainer );
        },
    },
    async created() {
        await this.setupServices( i18n );
        // no need to remove the below as we will require it throughout the application lifetime
        window.addEventListener( "resize", this.handleResize.bind( this ));
        // prepare adaptive view for mobile environment
        this.setToolboxOpened( true );
        if ( isMobile() ) {
            this.closeOpenedPanels();
        }
    },
    mounted() {
        if ( process.env.NODE_ENV !== "development" ) {
            window.onbeforeunload = e => {
                if ( this.activeDocument ) {
                    e.preventDefault();
                    return this.$t( "warningUnload" );
                }
                return true;
            };
        }

        // if File content is pasted or dragged into the application, parse and load image files within

        const loadFiles = ({ images, documents }) => {
            loadImageFiles( images, this.addLoadedFile.bind( this ));
            documents.forEach( async file => {
                const document = await DocumentFactory.fromBlob( file );
                this.addNewDocument( document );
            });
        };

        window.addEventListener( "paste", event => {
            loadFiles( readClipboardFiles( event?.clipboardData ));
        }, false );

        this.$el.addEventListener( "dragover", event => {
            event.stopPropagation();
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
        }, false );
        this.$el.addEventListener( "drop", event => {
            loadFiles( readDroppedFiles( event?.dataTransfer ));
            event.preventDefault();
            event.stopPropagation();
        }, false );
    },
    methods: {
        ...mapMutations([
            "setWindowSize",
            "closeModal",
            "closeOpenedPanels",
            "resetHistory",
            "setToolboxOpened",
            "setToolOptionValue",
            "addNewDocument",
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
            const optionsPanelWidth = this.$refs.panels?.clientWidth;
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
@import "@/styles/_global";
@import "@/styles/_mixins";
@import "@/styles/panel";

#app {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-image: linear-gradient(to bottom, $color-bg-dark 35%, $color-bg-light 90%);
    height: 100%;
    font-size: 15px;
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
        .panels {
            display: inline-block;
            vertical-align: top;
        }
        .toolbox,
        .panels {
            &.collapsed {
                width: $collapsed-panel-width;
                min-height: $heading-height;
            }
        }
        .panels {
            $optionsHeight: 250px;
            height: 100%;

            .tool-options-panel {
                height: calc(#{$optionsHeight - ($spacing-medium / 2 )});
            }
            .layer-panel {
                height: calc(100% - #{$optionsHeight + ($spacing-medium / 2 )});
                margin-top: $spacing-medium;
            }

            @include minHeight( 900px ) {
                $optionsHeight: 390px;
                .tool-options-panel {
                    height: calc(#{$optionsHeight - ($spacing-medium / 2 )});
                }
                .layer-panel {
                    height: calc(100% - #{$optionsHeight + ($spacing-medium / 2 )});
                    margin-top: $spacing-medium;
                }
            }
        }

        .toolbox {
            width: 113px;
        }
        .panels {
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
        .panels {
            position: fixed;
            width: 100%;
            max-height: 50%;
            //max-height: calc(100% - #{$menu-height * 3});
            bottom: 0;
            overflow-y: scroll;
            border-top: 1px solid $color-bg;

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
