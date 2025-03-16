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
    <nav class="menu"
         :class="{ opened: menuOpened }"
    >
        <div class="toggle" @click="setMenuOpened( !menuOpened )">
            <span>&#9776;</span>
        </div>
        <h1 class="heading">
            Bit<span class="emphasis">Mappery</span>
        </h1>
        <ul class="menu-list">
            <!-- file menu -->
            <li>
                <a v-t="'file'" class="title" @click.prevent="openSubMenu('file')"></a>
                <ul class="submenu"
                    :class="{ opened: activeSubMenu === 'file' }"
                    @click="close()"
                >
                    <li>
                        <button
                            v-t="'new'"
                            type="button"
                            v-tooltip.right="$t('newDocumentTooltip')"
                            @click="requestNewDocument()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'open'"
                            type="button"
                            @click="openFileSelector()"
                        ></button>
                    </li>
                    <li v-if="hasDropbox">
                        <button
                            v-t="'openDropboxDocument'"
                            type="button"
                            @click="initDropbox()"
                        ></button>
                    </li>
                    <li v-if="hasDrive">
                        <button
                            v-t="'openDriveDocument'"
                            type="button"
                            @click="initDrive()"
                        ></button>
                    </li>
                    <li v-if="hasS3">
                        <button
                            v-t="'openS3Document'"
                            type="button"
                            @click="initS3()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'close'"
                            v-tooltip.right="$t('closeDocumentTooltip')"
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestDocumentClose()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'save'"
                            v-tooltip.right="$t('saveDocumentTooltip')"
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestDocumentExport()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'exportImage'"
                            v-tooltip.right="$t('exportImageTooltip')"
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestImageExport()"
                        ></button>
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
            <li>
                <a v-t="'edit'" class="title" @click.prevent="openSubMenu('edit')"></a>
                <ul class="submenu"
                    :class="{ opened: activeSubMenu === 'edit' }"
                    @click="close()"
                >
                    <li>
                        <button
                            v-t="'undo'"
                            v-tooltip.right="$t('undoTooltip')"
                            type="button"
                            :disabled="!canUndo"
                            @click="navigateHistory('undo')"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'redo'"
                            v-tooltip.right="$t('redoTooltip')"
                            type="button"
                            :disabled="!canRedo"
                            @click="navigateHistory('redo')"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'cut'"
                            v-tooltip.right="$t('cutTooltip')"
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestSelectionCut()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'copy'"
                            v-tooltip.right="$t('copyTooltip')"
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestSelectionCopy({ merged: false })"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'copyMerged'"
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestSelectionCopy({ merged: true })"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'pasteAsNewLayer'"
                            type="button"
                            :disabled="!hasClipboard || !activeDocument"
                            @click="pasteSelection()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'clear'"
                            type="button"
                            :disabled="!hasSelection || !activeLayer"
                            @click="deleteInSelection()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'stroke'"
                            type="button"
                            :disabled="!hasSelection || !activeLayer"
                            @click="strokeSelection()"
                        ></button>
                    </li>
                </ul>
            </li>
            <!-- document menu -->
            <li>
                <a v-t="'document'" class="title" @click.prevent="openSubMenu('document')"></a>
                <ul class="submenu"
                    :class="{ opened: activeSubMenu === 'document' }"
                    @click="close()"
                >
                    <li>
                        <button
                            v-t="'resizeDocument'"
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestDocumentResize()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'canvasSize'"
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestCanvasResize()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'cropToSelection'"
                            type="button"
                            :disabled="!hasSelection"
                            @click="requestCropToSelection()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'sliceGridToLayers'"
                            type="button"
                            :disabled="noDocumentsAvailable"
                            @click="requestGridToLayers()"
                        ></button>
                    </li>
                </ul>
            </li>
            <!-- layer menu -->
            <li>
                <a v-t="'layer'" class="title" @click.prevent="openSubMenu('layer')"></a>
                <ul class="submenu"
                    :class="{ opened: activeSubMenu === 'layer' }"
                    @click="close()"
                >
                    <li>
                        <button
                            v-t="'duplicateLayer'"
                            type="button"
                            :disabled="!activeLayer"
                            @click="duplicateLayer()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'copyLayerFilters'"
                            type="button"
                            :disabled="!activeLayer"
                            @click="copyLayerFilters()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'pasteLayerFilters'"
                            type="button"
                            :disabled="!activeLayer || !clonedFilters"
                            @click="pasteLayerFilters()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="activeLayerHasFilters ? 'disableLayerFilters' : 'enableLayerFilters'"
                            type="button"
                            :disabled="!activeLayer"
                            @click="toggleLayerFilters()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'mergeDown'"
                            type="button"
                            :disabled="!activeLayer || activeLayerIndex === 0"
                            @click="mergeLayerDown()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'flattenImage'"
                            type="button"
                            :disabled="!activeLayer || activeDocument.layers.length < 2"
                            @click="mergeLayerDown( true )"
                        ></button>
                    </li>
                </ul>
            </li>
            <!-- selection menu -->
            <li>
                <a v-t="'selection'" class="title" @click.prevent="openSubMenu('selection')"></a>
                <ul class="submenu"
                    :class="{ opened: activeSubMenu === 'selection' }"
                    @click="close()"
                >
                    <li>
                        <button
                            v-t="'selectAll'"
                            v-tooltip.right="$t('selectAllTooltip')"
                            type="button"
                            :disabled="!activeLayer"
                            @click="selectAll()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'deselectAll'"
                            v-tooltip.right="$t('deselectAllTooltip')"
                            type="button"
                            :disabled="!hasSelection"
                            @click="clearSelection()"
                        ></button>
                    </li>
                    <li>
                        <button
                            v-t="'invertSelection'"
                            v-tooltip.right="$t('invertSelectionTooltip')"
                            type="button"
                            :disabled="!hasSelection"
                            @click="invertSelection()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'loadSelection'"
                                type="button"
                                :disabled="!hasSavedSelections"
                                @click="requestSelectionLoad()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'saveSelection'"
                                type="button"
                                :disabled="!hasSelection"
                                @click="requestSelectionSave()"
                        ></button>
                    </li>
                </ul>
            </li>
            <!-- preferences -->
            <li>
                <a
                    v-t="'preferences'"
                    class="title"
                    @click.prevent="openPreferences()"
                ></a>
            </li>
            <!-- view menu -->
            <li>
                <a v-t="'view'" class="title" @click.prevent="openSubMenu('view')"></a>
                <ul class="submenu"
                    :class="{ opened: activeSubMenu === 'view' }"
                    @click="close()"
                >
                    <li>
                        <button v-t="'snapAlign'" type="button" :class="{ checked: snapAlign }" @click="canSnapAndAlign = !canSnapAndAlign"></button>
                    </li>
                    <li>
                        <button v-t="'antiAlias'" type="button" :class="{ checked: antiAlias }" @click="useAntiAlias = !useAntiAlias"></button>
                    </li>
                    <li>
                        <button
                            v-t="'pixelGrid'"
                            type="button"
                            :class="{ checked: pixelGrid }"
                            :disabled="!canUsePixelGrid"
                            @click="usePixelGrid = !usePixelGrid"
                        ></button>
                    </li>
                </ul>
            </li>
            <!-- window menu -->
            <li>
                <a v-t="'window'" class="title" @click.prevent="openSubMenu('window')"></a>
                <ul class="submenu"
                    :class="{ opened: activeSubMenu === 'window' }"
                    @click="close()"
                >
                    <template v-if="documents.length">
                        <li v-for="(doc, index) in documents"
                            :key="`doc_${index}`"
                        >
                            <button @click="setActiveDocument( index )">
                                {{ $t( "windowNumName", { num: index + 1, name: doc.name }) }}
                            </button>
                        </li>
                    </template>
                    <li v-else><span v-t="'noDocumentsOpen'" class="menu-text"></span></li>
                </ul>
            </li>
            <!-- help menu -->
            <li>
                <a v-t="'help'" href="https://www.igorski.nl/bitmappery/help" target="_blank" class="title" @click="close()"></a>
            </li>
        </ul>
        <!-- fullscreen button -->
        <button
            v-if="supportsFullscreen"
            v-tooltip.left="fullscreenTooltip"
            ref="fullscreenBtn"
            class="fullscreen-button"
            :title="$t( isFullscreen ? 'minimize' : 'maximize' )"
        >
            <img
                v-if="isFullscreen"
                src="@/assets-inline/images/icon-minimize.svg"
                :alt="$t( 'minimize' )"
            />
            <img
                v-else
                src="@/assets-inline/images/icon-maximize.svg"
                :alt="$t( 'maximize' )"
            />
        </button>
    </nav>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import cloneDeep from "lodash.clonedeep";
import { type Layer } from "@/definitions/document";
import { MAX_SPRITESHEET_WIDTH } from "@/definitions/editor-properties";
import {
    CREATE_DOCUMENT, RESIZE_DOCUMENT, SAVE_DOCUMENT, EXPORT_WINDOW, LOAD_SELECTION, SAVE_SELECTION,
    PREFERENCES, RESIZE_CANVAS, GRID_TO_LAYERS, STROKE_SELECTION
} from "@/definitions/modal-windows";
import CloudServiceConnector from "@/mixins/cloud-service-connector";
import ImageToDocumentManager from "@/mixins/image-to-document-manager";
import { getCanvasInstance } from "@/factories/renderer-factory";
import { enqueueState } from "@/factories/history-state-factory";
import LayerFactory from "@/factories/layer-factory";
import { supportsFullscreen, setToggleButton } from "@/utils/environment-util";
import { cloneCanvas, resizeImage } from "@/utils/canvas-util";
import { supportsDropbox, supportsGoogleDrive, supportsS3 } from "@/utils/cloud-service-loader";
import { createSyncSnapshot } from "@/utils/document-util";
import { selectionToRectangle } from "@/utils/selection-util";
import sharedMessages from "@/messages.json"; // for CloudServiceConnector
import messages from "./messages.json";

export default {
    i18n: { messages, sharedMessages },
    mixins: [ CloudServiceConnector, ImageToDocumentManager ],
    data: () => ({
        activeSubMenu: null, // used for mobile views collapsed / expanded view
        clonedFilters: null,
        isFullscreen: false,
        hasDropbox: supportsDropbox(),
        hasDrive: supportsGoogleDrive(),
        hasS3: supportsS3(),
    }),
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
        activeLayerHasFilters(): boolean {
            return this.activeLayer?.filters?.enabled;
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
                this.setAntiAlias( value );
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
        fullscreenTooltip(): string {
            return `${this.isFullscreen ? this.$t( "minimize" ) : this.$t( "maximize" )} (Shift + F)`;
        },
        canUsePixelGrid(): boolean {
            return this.activeDocument?.width <= MAX_SPRITESHEET_WIDTH;
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
                window.setTimeout(() => {
                    getCanvasInstance()?.rescaleFn();
                }, 100 );
            });
        }
    },
    methods: {
        ...mapMutations([
            "setMenuOpened",
            "showNotification",
            "openModal",
            "setActiveDocument",
            "setActiveDocumentSize",
            "closeActiveDocument",
            "cropActiveDocumentContent",
            "setPreferences",
            "setSnapAlign",
            "setAntiAlias",
            "setPixelGrid",
            "updateLayer",
        ]),
        ...mapActions([
            "requestDocumentClose",
            "requestSelectionCopy",
            "requestSelectionCut",
            "clearSelection",
            "pasteSelection",
            "invertSelection",
            "deleteInSelection",
            "loadDocument",
            "storePreferences",
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
        requestDocumentExport(): void {
            this.openModal( SAVE_DOCUMENT );
        },
        requestSelectionLoad(): void {
            this.openModal( LOAD_SELECTION );
        },
        requestSelectionSave(): void {
            this.openModal( SAVE_SELECTION );
        },
        openPreferences(): void {
            this.openModal( PREFERENCES );
        },
        strokeSelection(): void {
            this.openModal( STROKE_SELECTION );
        },
        requestCropToSelection(): void {
            const store = this.$store;
            const currentSize = {
                width  : this.activeDocument.width,
                height : this.activeDocument.height
            };
            const selection = [ ...this.activeDocument.activeSelection ];
            const { left, top, width, height } = selectionToRectangle( selection );
            const commit = async () => {
                await store.commit( "cropActiveDocumentContent", { left, top });
                store.commit( "setActiveDocumentSize", {
                    width  : Math.min( currentSize.width  - left, width ),
                    height : Math.min( currentSize.height - top,  height )
                });
                getCanvasInstance()?.interactionPane.setSelection( null, false );
            };
            commit();
            enqueueState( "crop", {
                async undo() {
                    await store.commit( "cropActiveDocumentContent", { left: -left, top: -top });
                    store.commit( "setActiveDocumentSize", currentSize );
                    getCanvasInstance()?.interactionPane.setSelection( selection, false );
                },
                redo: commit
            });
        },
        navigateHistory( action = "undo" ): void {
            this.$store.dispatch( action );
        },
        duplicateLayer(): void {
            const indexToAdd = this.activeLayerIndex + 1;
            let layer = {
                ...cloneDeep( this.activeLayer ),
                id: undefined, // store will generate new one
                name: `${this.activeLayer.name} #2`,
                source: cloneCanvas( this.activeLayer.source ),
                mask: this.activeLayer.mask ? cloneCanvas( this.activeLayer.mask ) : null
            };
            const store  = this.$store;
            const commit = () => store.commit( "insertLayerAtIndex", { index: indexToAdd, layer });
            commit();
            const index = this.activeLayerIndex;
            layer = this.activeLayer; // update layer ref with constructed Layer instance
            enqueueState( `duplicate_${index}`, {
                undo() {
                    store.commit( "removeLayer", index );
                },
                redo: commit,
            });
        },
        async mergeLayerDown( allLayers = false ): Promise<void> {
            let layers: Layer[] = [];
            let layerIndices: number[] = [];
            // collect the layers in ascending order
            if ( allLayers ) {
                this.activeDocument.layers.forEach(( layer, index ) => {
                    layers.push( layer );
                    layerIndices.push( index );
                });
            } else {
                layerIndices = [ this.activeLayerIndex - 1, this.activeLayerIndex ];
                layers = [ this.activeDocument.layers[ layerIndices[ 0 ]], this.activeLayer ];
            }
            const { width, height } = this.activeDocument;
            const mergeIndex = allLayers ? 0 : layerIndices[ 0 ];
            const newLayer = LayerFactory.create({
                name: this.$t( "mergedLayer" ),
                source: await resizeImage( createSyncSnapshot( this.activeDocument, layerIndices ), width, height ),
                width,
                height,
            });
            const store = this.$store;
            const commit = () => {
                let i = layerIndices.length;
                while ( i-- ) {
                    store.commit( "removeLayer", layerIndices[ i ] );
                }
                store.commit( "insertLayerAtIndex", { index: mergeIndex, layer: newLayer });
            };
            commit();
            enqueueState( `merge_${mergeIndex}_${layers.length}`, {
                undo() {
                    store.commit( "removeLayer", mergeIndex );
                    layers.forEach(( layer, index ) => store.commit( "insertLayerAtIndex", { index: layerIndices[ index ], layer }));
                },
                redo: commit,
            });
        },
        copyLayerFilters(): void {
            this.clonedFilters = { ...this.activeLayer.filters };
            this.showNotification({ message: this.$t( "filtersCopied" ) });
        },
        pasteLayerFilters(): void {
            const orgFilters = { ...this.activeLayer.filters };
            const filters    = { ...this.clonedFilters };
            const index      = this.activeLayerIndex;
            const store      = this.$store;
            const commit     = () => store.commit( "updateLayer", { index, opts: { filters } });
            commit();
            enqueueState( `pasteFilters_${index}`, {
                undo() {
                    store.commit( "updateLayer", { index, opts: { filters: { ...orgFilters } }});
                },
                redo: commit,
            });
        },
        toggleLayerFilters(): void {
            const enabled = this.activeLayerHasFilters;
            const filters = this.activeLayer.filters;
            this.updateLayer({
                index: this.activeLayerIndex,
                opts: { filters: { ...filters, enabled: !enabled} }
            });
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

$toggle-width: 50px;

.heading {
    @include typography.customFont();
    letter-spacing: variables.$spacing-xxsmall;

    .emphasis {
        letter-spacing: math.div( variables.$spacing-xxsmall, 4 );
    }
}

.menu {
    color: #b6b6b6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 auto;
    padding: variables.$spacing-small variables.$spacing-medium;
    width: 100%;
    height: variables.$menu-height;
    background-image: colors.$color-window-bg;
    @include mixins.boxSize();

    @include mixins.large() {
        min-width: 100%;
        max-width: variables.$ideal-width;
        margin: 0 auto;
        padding-left: variables.$spacing-large;
    }

    @include mixins.mobile() {
        position: fixed;
        z-index: 5;
        overflow: hidden;
        width: 100%;
        top: 0;
        left: 0;

        &.opened {
            position: absolute;
            height: 100%;

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

        h1 {
            display: none;
        }

        ul {
            display: block;
            width: 100%;
            padding: 0;

            li {
                display: block;
                width: 100%;

                a {
                    width: 100%;
                }
            }
        }

        ul {
            h1 {
               display: none;
            }

            li {
                .submenu li {
                    padding: variables.$spacing-small 0;
                }

                a {
                    display: block;
                    width: 100%;
                    padding: variables.$spacing-medium variables.$spacing-large;
                    color: #000;

                    &:hover {
                        color: #000;
                    }
                }

                &.active a {
                    border-bottom: none;
                    color: #FFF;
                    font-weight: bold;
                    font-style: italic;
                    background-color: colors.$color-1;
                }
            }
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

.menu-list {
    flex: 1;
    list-style-type: none;
    padding: 0;
    margin: 0;
    @include mixins.boxSize();

    li {
        display: inline-block;
        padding: 0 variables.$spacing-medium 0 0;
        margin: 0;
        font-family: Montserrat, Helvetica, Verdana;
        cursor: pointer;

        a {
            color: #b6b6b6;
            text-decoration: none;
            padding-bottom: variables.$spacing-large;
        }

        &:hover,
        &:hover a {
            color: colors.$color-1;
            border-bottom: none;
            text-decoration: none;
        }

        &.active {
            a {
                border-bottom: 3px solid #555;
            }
        }

        button {
            background: none;
            cursor: pointer;
            border: none;
            color: #b6b6b6;
            margin: 0;
            padding: 0;
            font-size: 95%;

            &:disabled {
                color: colors.$color-bg !important;
            }

            &.checked::before {
                content: "\2713";
                margin-right: variables.$spacing-small;
            }

            &:hover {
                color: colors.$color-4;
            }
        }

        ul {
            list-style: none;
        }

        @include mixins.large() {
            &:hover, &:focus {
                a {
                    color: colors.$color-1;
                }
                ul {
                    display: block;
                    z-index: 2;
                }
            }
            ul {
                display: none;
                position: absolute;
                box-shadow: 0 0 5px rgba(0,0,0,.5);
                padding: variables.$spacing-medium;
                background-image: colors.$color-window-bg;
                background-repeat: repeat-x;
                @include mixins.boxSize();
            }
        }
    }

    @include mixins.mobile() {
        position: absolute;
        top: variables.$menu-height;
        background-image: linear-gradient(to bottom,#fff 35%,#eee 90%);
        background-repeat: repeat-x;
        display: none;

        .title {
            padding: variables.$spacing-small variables.$spacing-medium;
        }

        .submenu {
            display: none;

            &.opened {
                display: block;
                padding-left: variables.$spacing-medium;
                background-image: colors.$color-window-bg;
            }
        }
    }
}

.submenu {
    @include mixins.large() {
        li {
            display: block;
            color: #b6b6b6;
            padding: variables.$spacing-xsmall variables.$spacing-medium;

            &:hover {
                color: #FFF;
            }
        }
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
