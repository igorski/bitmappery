/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2026 - https://www.igorski.nl
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
    <nav class="menu"
         :class="{ 'menu--opened': menuOpened }"
    >
        <div class="toggle" @click="setMenuOpened( !menuOpened )">
            <span>&#9776;</span>
        </div>
        <img
            class="logo"
            src="/assets/favicon/favicon-96x96.png"
            alt="BitMappery logo"
        />
        <ul class="menu-list">
            <!-- file menu -->
            <li tabindex="0">
                <a class="title" @click.prevent="openSubMenu('file')">{{ t( "file" ) }}</a>
                <ul class="submenu"
                    :class="{ 'submenu--opened': activeSubMenu === 'file' }"
                    @click="close()"
                >
                    <li>
                        <button
                            type="button"
                            v-tooltip.right="t('newDocumentTooltip')"
                            @click="requestNewDocument()"
                        >{{ t( "new" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            @click="openFileSelector()"
                        >{{ t( "open" ) }}</button>
                    </li>
                    <li v-if="hasDropbox">
                        <button
                            type="button"
                            @click="initDropbox()"
                        >{{ t( "openDropboxDocument" ) }}</button>
                    </li>
                    <li v-if="hasDrive">
                        <button
                            type="button"
                            @click="initDrive()"
                        >{{ t( "openDriveDocument" ) }}</button>
                    </li>
                    <li v-if="hasS3">
                        <button
                            type="button"
                            @click="initS3()"
                        >{{ t( "openS3Document" ) }}</button>
                    </li>
                    <li>
                        <button
                            v-tooltip.right="t('closeDocumentTooltip')"
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestDocumentClose()"
                        >{{ t( "close" ) }}</button>
                    </li>
                    <li>
                        <button
                            v-tooltip.right="t('saveDocumentTooltip')"
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestDocumentExport()"
                        >{{ t( "save" ) }}</button>
                    </li>
                    <li>
                        <button
                            v-tooltip.right="t('exportImageTooltip')"
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestImageExport()"
                        >{{ t( "exportImage" ) }}</button>
                    </li>
                    <input
                        ref="fileSelector"
                        type="file"
                        multiple
                        :accept="acceptedFileTypes"
                        class="file-selector"
                        @change="handleFileSelect"
                    />
                </ul>
            </li>
            <!-- edit menu -->
            <li tabindex="0">
                <a class="title" @click.prevent="openSubMenu('edit')">{{ t( "edit" ) }}</a>
                <ul class="submenu"
                    :class="{ 'submenu--opened': activeSubMenu === 'edit' }"
                    @click="close()"
                >
                    <li>
                        <button
                            v-tooltip.right="t('undoTooltip')"
                            type="button"
                            :disabled="!canUndo"
                            @click="navigateHistory('undo')"
                        >{{ t( "undo" ) }}</button>
                    </li>
                    <li>
                        <button
                            v-tooltip.right="t('redoTooltip')"
                            type="button"
                            :disabled="!canRedo"
                            @click="navigateHistory('redo')"
                        >{{ t( "redo" ) }}</button>
                    </li>
                    <li>
                        <button
                            v-tooltip.right="t('cutTooltip')"
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestSelectionCut()"
                        >{{ t( "cut" ) }}</button>
                    </li>
                    <li>
                        <button
                            v-tooltip.right="t('copyTooltip')"
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestSelectionCopy({ merged: false })"
                        >{{ t( "copy" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestSelectionCopy({ merged: true })"
                        >{{ t( "copyMerged" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="!hasClipboard || !activeDocument"
                            @click="pasteSelection()"
                        >{{ t( "pasteAsNewLayer" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="!hasSelection || !activeLayer"
                            @click="deleteInSelection()"
                        >{{ t( "clear" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="!hasSelection || !activeLayer"
                            @click="strokeSelection()"
                        >{{ t( "stroke" ) }}</button>
                    </li>
                </ul>
            </li>
            <!-- document menu -->
            <li tabindex="0">
                <a class="title" @click.prevent="openSubMenu('document')">{{ t( "document" ) }}</a>
                <ul class="submenu"
                    :class="{ 'submenu--opened': activeSubMenu === 'document' }"
                    @click="close()"
                >
                    <li>
                        <button
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestDocumentResize()"
                        >{{ t( "resizeDocument" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestCanvasResize()"
                        >{{ t( "canvasSize" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestCropToSelection()"
                        >{{ t( "cropToSelection" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestGridToLayers()"
                        >{{ t( "sliceGridToLayers" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestPropertiesEdit()"
                        >{{ t( "properties" ) }}</button>
                    </li>
                </ul>
            </li>
            <!-- layer menu -->
            <li tabindex="0">
                <a class="title" @click.prevent="openSubMenu('layer')">{{ t( "layer" ) }}</a>
                <layer-menu
                    :opened="activeSubMenu === 'layer'"
                    @click="close()"
                />
            </li>
            <!-- selection menu -->
            <li tabindex="0">
                <a class="title" @click.prevent="openSubMenu('selection')">{{ t( "selection" ) }}</a>
                <ul class="submenu"
                    :class="{ 'submenu--opened': activeSubMenu === 'selection' }"
                    @click="close()"
                >
                    <li>
                        <button
                            v-tooltip.right="t('selectAllTooltip')"
                            type="button"
                            :disabled="!activeLayer"
                            @click="selectAll()"
                        >{{ t( "selectAll" ) }}</button>
                    </li>
                    <li>
                        <button
                            v-tooltip.right="t('deselectAllTooltip')"
                            type="button"
                            :disabled="!hasSelection"
                            @click="clearSelection()"
                        >{{ t( "deselectAll" ) }}</button>
                    </li>
                    <li>
                        <button
                            v-tooltip.right="t('invertSelectionTooltip')"
                            type="button"
                            :disabled="!hasSelection"
                            @click="invertSelection()"
                        >{{ t( "invertSelection" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestSelectionExpand()"
                        >{{ t( "expandSelection" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestSelectionShrink()"
                        >{{ t( "shrinkSelection" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="!hasSavedSelections"
                            @click="requestSelectionLoad()"
                        >{{ t( "loadSelection" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestSelectionSave()"
                        >{{ t( "saveSelection" ) }}</button>
                    </li>
                </ul>
            </li>
            <!-- preferences -->
            <li tabindex="0">
                <a
                    class="title"
                    @click.prevent="openPreferences()"
                >{{ t( "preferences" ) }}</a>
            </li>
            <!-- view menu -->
            <li tabindex="0">
                <a class="title" @click.prevent="openSubMenu('view')">{{ t( "view" ) }}</a>
                <ul class="submenu"
                    :class="{ 'submenu--opened': activeSubMenu === 'view' }"
                    @click="close()"
                >
                    <li>
                        <button
                            type="button"
                            :class="{ checked: snapAlign }"
                            @click="canSnapAndAlign = !canSnapAndAlign"
                        >{{ t( "snapAlign" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :class="{ checked: antiAlias }"
                            @click="useAntiAlias = !useAntiAlias"
                        >{{ t( "antiAlias" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :class="{ checked: useTracing }"
                            :disabled="!canUseTracing"
                            @click="useTracing = !useTracing"
                        >{{ t( "useTracing" ) }}</button>
                    </li>
                    <li>
                        <button
                            type="button"
                            :class="{ checked: pixelGrid }"
                            :disabled="!canUsePixelGrid"
                            @click="usePixelGrid = !usePixelGrid"
                        >{{ t( "pixelGrid" ) }}</button>
                    </li>
                </ul>
            </li>
            <!-- window menu -->
            <li tabindex="0">
                <a class="title" @click.prevent="openSubMenu('window')">{{ t( "window" ) }}</a>
                <ul class="submenu"
                    :class="{ 'submenu--opened': activeSubMenu === 'window' }"
                    @click="close()"
                >
                    <template v-if="documents.length">
                        <li v-for="(doc, index) in documents"
                            :key="`doc_${index}`"
                        >
                            <button @click="setActiveDocument( index )">
                                {{ t( "windowNumName", { num: index + 1, name: doc.name }) }}
                            </button>
                        </li>
                    </template>
                    <li v-else><span class="menu-text">{{ t( "noDocumentsOpen" ) }}</span></li>
                </ul>
            </li>
            <!-- help menu -->
            <li>
                <a href="https://www.igorski.nl/bitmappery/help" target="_blank" class="title" @click="close()">{{ t( "help" ) }}</a>
            </li>
        </ul>
        <!-- fullscreen button -->
        <button
            v-if="supportsFullscreen"
            v-tooltip.left="fullscreenTooltip"
            ref="fullscreenBtn"
            class="fullscreen-button"
            :title="t( isFullscreen ? 'minimize' : 'maximize' )"
        >
            <img
                v-if="isFullscreen"
                src="@/assets-inline/images/icon-minimize.svg"
                :alt="t( 'minimize' )"
            />
            <img
                v-else
                src="@/assets-inline/images/icon-maximize.svg"
                :alt="t( 'maximize' )"
            />
        </button>
    </nav>
</template>

<script lang="ts">
import { defineAsyncComponent } from "vue";
import { type ComposerTranslation, useI18n } from "vue-i18n";
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import { isPixelArt } from "@/definitions/editor-properties";
import {
    CREATE_DOCUMENT, RESIZE_DOCUMENT, SAVE_DOCUMENT, EXPORT_WINDOW,
    SELECTION_EXPAND, SELECTION_SHRINK, SELECTION_LOAD, SELECTION_SAVE,
    PREFERENCES, RESIZE_CANVAS, GRID_TO_LAYERS, STROKE_SELECTION, DOCUMENT_PROPERTIES,
} from "@/definitions/modal-windows";
import CloudServiceConnector from "@/mixins/cloud-service-connector";
import ImageToDocumentManager from "@/mixins/image-to-document-manager";
import { getCanvasInstance } from "@/services/canvas-service";
import { cropToSelection } from "@/model/actions/crop-to-selection";
import { pasteCopiedContent } from "@/model/actions/content-paste";
import { deleteSelection } from "@/model/actions/selection-delete";
import { supportsFullscreen, setToggleButton } from "@/utils/environment-util";
import { supportsDropbox, supportsGoogleDrive, supportsS3 } from "@/utils/cloud-service-loader";
import sharedMessages from "@/messages.json"; // for CloudServiceConnector
import messages from "./messages.json";

export default {
    emits: [ "rescale" ],
    mixins: [ CloudServiceConnector, ImageToDocumentManager ],
    components: {
        LayerMenu : defineAsyncComponent({ loader: () => import( "@/components/menus/layer-menu/layer-menu.vue" ) }),
    },
    data: () => ({
        activeSubMenu: null, // used for mobile views collapsed / expanded view
        isFullscreen: false,
        hasDropbox: supportsDropbox(),
        hasDrive: supportsGoogleDrive(),
        hasS3: supportsS3(),
    }),
    setup(): { t: ComposerTranslation } {
        const { t } = useI18n({ messages, sharedMessages });
        return { t };
    },
    computed: {
        ...mapState([
            "menuOpened",
            "blindActive",
            "selectionContent",
        ]),
        ...mapGetters([
            "documents",
            "activeDocument",
            "activeLayer",
            "activeLayerIndex",
            "antiAlias",
            "canUndo",
            "canRedo",
            "getPreferences",
            "hasSelection",
            "showTrace",
            "snapAlign",
            "pixelGrid",
        ]),
        supportsFullscreen,
        noDocumentsAvailable(): boolean {
            return !this.activeDocument;
        },
        hasSavedSelections(): boolean {
            return Object.keys( this.activeDocument?.selections || {} ).length > 0;
        },
        hasClipboard(): boolean {
            return !!this.selectionContent;
        },
        canSnapAndAlign: {
            get(): boolean {
                return this.snapAlign;
            },
            async set( value: boolean ): Promise<void> {
                this.setSnapAlign( value );
                this.setPreferences({ snapAlign: value });
                await this.storePreferences();
            }
        },
        useAntiAlias: {
            get(): boolean {
                return this.antiAlias;
            },
            async set( value: boolean ): Promise<void> {
                this.updateAntiAlias( value );
                this.setPreferences({ antiAlias: value });
                await this.storePreferences();
            }
        },
        usePixelGrid: {
            get(): boolean {
                return this.pixelGrid;
            },
            set( value: boolean ): void {
                this.setPixelGrid( value );
            },
        },
        useTracing: {
            get(): boolean {
                return this.showTrace;
            },
            set( value: boolean ): void {
                this.setShowTrace( value );
            },
        },
        fullscreenTooltip(): string {
            return `${this.isFullscreen ? this.t( "minimize" ) : this.t( "maximize" )} (Shift + F)`;
        },
        canUsePixelGrid(): boolean {
            if ( !this.activeDocument ) {
                return false;
            }
            return isPixelArt( this.activeDocument );
        },
        canUseTracing(): boolean {
            return this.activeDocument?.type === "timeline";
        },
    },
    watch: {
        blindActive( isOpen: boolean, wasOpen?: boolean ): void {
            if ( !isOpen && wasOpen === true ) {
                this.setMenuOpened( false );
            }
        },
        canUsePixelGrid( value: boolean ): void {
            if ( !value && this.usePixelGrid ) {
                this.usePixelGrid = false;
            }
        },
    },
    mounted(): void {
        if ( this.$refs.fullscreenBtn ) {
            setToggleButton( this.$refs.fullscreenBtn, isFullscreen => {
                this.isFullscreen = isFullscreen;
                // slight timeout as resize doesn't fire until full screen toggle is complete
                setTimeout(() => {
                    getCanvasInstance()?.rescaleFn();
                    this.$emit( "rescale" );
                }, 100 );
            });
        }
    },
    methods: {
        ...mapMutations([
            "setMenuOpened",
            "openModal",
            "setActiveDocument",
            "setActiveDocumentSize",
            "closeActiveDocument",
            "cropActiveDocumentContent",
            "setPreferences",
            "setShowTrace",
            "setSnapAlign",
            "setPixelGrid",
            "updateLayer",
        ]),
        ...mapActions([
            "requestDocumentClose",
            "requestSelectionCopy",
            "requestSelectionCut",
            "clearSelection",
            "invertSelection",
            "loadDocument",
            "storePreferences",
            "updateAntiAlias",
        ]),
        openSubMenu( name: string ): void {
            this.activeSubMenu = this.activeSubMenu === name ? null : name;
        },
        requestNewDocument(): void {
            this.openModal( CREATE_DOCUMENT );
        },
        openFileSelector(): void {
            this.$refs.fileSelector?.click();
        },
        requestImageExport(): void {
            this.openModal( EXPORT_WINDOW );
        },
        requestDocumentResize(): void {
            this.openModal( RESIZE_DOCUMENT );
        },
        requestCanvasResize(): void {
            this.openModal( RESIZE_CANVAS );
        },
        requestGridToLayers(): void {
            this.openModal( GRID_TO_LAYERS );
        },
        requestPropertiesEdit(): void {
            this.openModal( DOCUMENT_PROPERTIES );
        },
        requestDocumentExport(): void {
            this.openModal( SAVE_DOCUMENT );
        },
        requestSelectionExpand(): void {
            this.openModal( SELECTION_EXPAND );
        },
        requestSelectionShrink(): void {
            this.openModal( SELECTION_SHRINK );
        },
        requestSelectionLoad(): void {
            this.openModal( SELECTION_LOAD );
        },
        deleteInSelection(): void {
            deleteSelection( this.$store );
        },
        requestSelectionSave(): void {
            this.openModal( SELECTION_SAVE );
        },
        openPreferences(): void {
            this.openModal( PREFERENCES );
        },
        pasteSelection(): void {
            pasteCopiedContent( this.$store );
        },
        strokeSelection(): void {
            this.openModal( STROKE_SELECTION );
        },
        requestCropToSelection(): void {
            cropToSelection( this.$store, this.activeDocument );
        },
        navigateHistory( action = "undo" ): void {
            this.$store.dispatch( action );
        },
        selectAll(): void {
            getCanvasInstance()?.interactionPane.selectAll();
        },
        close(): void {
            this.setMenuOpened( false );
            this.activeSubMenu = null;
        },
    }
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/typography";
@use "@/styles/ui";

$toggle-width: 50px;

.logo {
    width: variables.$spacing-large;
    margin-right: variables.$spacing-medium;
}

.menu {
    color: #b6b6b6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: variables.$spacing-small variables.$spacing-medium;
    width: 100%;
    height: variables.$menu-height;
    background-image: colors.$color-window-bg;
    @include mixins.boxSize();
    @include ui.nestedMenu();
    
    @include mixins.large() {
        min-width: 100%;
        max-width: variables.$ideal-width;
        padding-left: variables.$spacing-xlarge;

        @media screen and (min-height: variables.$ideal-height) {
            padding-left: variables.$spacing-medium + variables.$spacing-xsmall;
        }
    }

    @include mixins.mobile() {
        position: fixed;
        z-index: variables.$z-header;
        overflow: hidden;
        width: 100%;
        top: 0;
        left: 0;

        &--opened {
            position: absolute;
            height: 100%;
            z-index: variables.$z-open-menu;

            .menu-list {
                left: 0;
                display: block;
                height: 100%;
                padding-bottom: 46px; // is toggle height
                overflow-y: auto;
            }
        }

        .toggle {
            display: block;
        }

        .logo {
            display: none;
        }
    }

    &-text {
        font-size: 95%;
    }
}

.toggle {
    position: absolute;
    display: none;
    cursor: pointer;
    top: 0;
    left: 0;
    width: $toggle-width;
    height: variables.$menu-height;

    span {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
}

h1 {
    display: inline;
    margin: 0;
    padding: 0;
    padding-right: variables.$spacing-medium;
    font-size: 110%;
    font-weight: bold;

    .emphasis {
        color: #FFF;
    }
}

.file-selector {
    display: none;
}

.fullscreen-button {
    height: math.div( variables.$menu-height, 2 );
    cursor: pointer;
    background: transparent;
    border: none;

    &:hover {
        filter: brightness(0) invert(1);
    }

    @include mixins.mobile() {
        position: absolute;
        top: #{math.div( variables.$menu-height, 2 ) - 10px};
        right: variables.$spacing-medium;
    }
}
</style>
