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
        <!-- notifications -->
        <notifications />
    </div>
</template>

<script>
import Vue                 from "vue";
import Vuex, { mapState, mapMutations, mapActions } from "vuex";
import VueI18n         from "vue-i18n";
import ApplicationMenu from "@/components/application-menu/application-menu";
import DocumentCanvas  from "@/components/document-canvas/document-canvas";
import OptionsPanel    from "@/components/options-panel/options-panel";
import Toolbox         from "@/components/toolbox/toolbox";
import DialogWindow    from "@/components/dialog-window/dialog-window";
import Notifications   from '@/components/notifications/notifications';
import { isMobile }    from "@/utils/environment-util";
import store           from "./store";
import messages        from "./messages.json";
import {
    RESIZE_DOCUMENT, DROPBOX_FILE_BROWSER
} from "@/definitions/modal-windows";

Vue.use( Vuex );
Vue.use( VueI18n );

// Create VueI18n instance with options
const i18n = new VueI18n({
    messages
});

export default {
    i18n,
    store: new Vuex.Store( store ),
    components: {
        ApplicationMenu,
        DocumentCanvas,
        Toolbox,
        DialogWindow,
        OptionsPanel,
        Notifications,
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
        activeModal() {
            switch ( this.modal ) {
                default:
                    return null;
                case RESIZE_DOCUMENT:
                    return () => import( "@/components/edit-menu/resize-document/resize-document" );
                case DROPBOX_FILE_BROWSER:
                    return () => import( "@/components/dropbox-file-browser/dropbox-file-browser" );
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
        // no need to remove the below as we will require it throughout the application lifteimte
        window.addEventListener( "resize", this.handleResize.bind( this ));
        // 640 declared in _variables.scss to be mobile threshold
        if ( !isMobile() ) {
            this.setToolboxOpened( true );
        }
    },
    methods: {
        ...mapMutations([
            "setWindowSize",
            "closeModal",
            "setToolboxOpened",
        ]),
        ...mapActions([
            "setupServices",
        ]),
        handleResize() {
            this.setWindowSize({ width: window.innerWidth, height: window.innerHeight });
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
            this.$nextTick(() => this.$refs.documentCanvas?.scaleCanvas());
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

    .toolbox,
    .document-container,
    .options-panel {
        display: inline-block;
        vertical-align: top;
    }
    .toolbox,
    .options-panel {
        @include mobile() {
            position: absolute;
            top: $menu-height;
            z-index: 2;
        }
        &.collapsed {
            width: 45px;
            min-height: 40px;
        }
    }

    .toolbox {
        width: 150px;
    }
    .document-container {
        width: 100%;
        margin: 0 $spacing-medium;
    }
    .options-panel {
        width: 300px;
        @include mobile() {
            right: 0;
        }
    }
}
</style>
