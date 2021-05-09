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
                        <button v-t="'new'"
                                @click="requestNewDocument()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'open'"
                                type="button"
                                @click="openFileSelector()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'close'"
                                :disabled="noDocumentsAvailable"
                                @click="requestDocumentClose()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'save'"
                                type="button"
                                :disabled="noDocumentsAvailable"
                                @click="requestDocumentExport()"
                        ></button>
                    </li>
                    <template v-if="dropboxConnected">
                        <li>
                            <button v-t="'openDropboxDocument'"
                                    type="button"
                                    @click="requestDropboxLoad()"
                            ></button>
                        </li>
                        <li>
                            <button v-t="'saveDropboxDocument'"
                                    type="button"
                                    :disabled="noDocumentsAvailable"
                                    @click="requestDropboxSave()"
                            ></button>
                        </li>
                    </template>
                    <li>
                        <button v-t="'exportImage'"
                                type="button"
                                :disabled="noDocumentsAvailable"
                                @click="requestImageExport()"
                        ></button>
                    </li>
                    <input
                        ref="fileSelector"
                        type="file"
                        multiple
                        :accept="acceptedImageTypes"
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
                        <button v-t="'undo'"
                                type="button"
                                :disabled="!canUndo"
                                @click="navigateHistory('undo')"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'redo'"
                                type="button"
                                :disabled="!canRedo"
                                @click="navigateHistory('redo')"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'cut'"
                                type="button"
                                :disabled="!hasSelection"
                                @click="requestSelectionCut()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'copy'"
                                type="button"
                                :disabled="!hasSelection"
                                @click="requestSelectionCopy( false )"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'copyMerged'"
                                type="button"
                                :disabled="!hasSelection"
                                @click="requestSelectionCopy( true )"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'pasteAsNewLayer'"
                                type="button"
                                :disabled="!hasClipboard || !activeDocument"
                                @click="pasteSelection()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'clear'"
                                type="button"
                                :disabled="!hasSelection || !activeLayer"
                                @click="deleteInSelection()"
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
                        <button v-t="'resizeDocument'"
                                type="button"
                                :disabled="noDocumentsAvailable"
                                @click="requestDocumentResize()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'canvasSize'"
                                type="button"
                                :disabled="noDocumentsAvailable"
                                @click="requestCanvasResize()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'cropToSelection'"
                                type="button"
                                :disabled="!hasSelection"
                                @click="requestCropToSelection()"
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
                        <button v-t="'duplicateLayer'"
                                type="button"
                                :disabled="!activeLayer"
                                @click="duplicateLayer()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'copyLayerFilters'"
                                type="button"
                                :disabled="!activeLayer"
                                @click="copyLayerFilters()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'pasteLayerFilters'"
                                type="button"
                                :disabled="!activeLayer || !clonedFilters"
                                @click="pasteLayerFilters()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'mergeDown'"
                                type="button"
                                :disabled="!activeLayer || activeLayerIndex === 0"
                                @click="mergeLayerDown()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'flattenImage'"
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
                        <button v-t="'selectAll'"
                                type="button"
                                :disabled="!activeLayer"
                                @click="selectAll()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'deselectAll'"
                                type="button"
                                :disabled="!hasSelection"
                                @click="clearSelection()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'invertSelection'"
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
                    <li v-else><span v-t="'noDocumentsOpen'"></span></li>
                </ul>
            </li>
            <!-- help menu -->
            <li>
                <a v-t="'help'" href="https://www.igorski.nl/bitmappery/help" target="_blank" class="title" @click="close()"></a>
            </li>
        </ul>
        <!-- fullscreen button -->
        <div v-if="supportsFullscreen"
            v-t="'maximize'"
            ref="fullscreenBtn"
            class="fullscreen-button"
            data-api-fullscreen
        ></div>
    </nav>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import cloneDeep from "lodash.clonedeep";
import {
    CREATE_DOCUMENT, RESIZE_DOCUMENT, EXPORT_DOCUMENT, EXPORT_IMAGE, LOAD_SELECTION, SAVE_SELECTION,
    DROPBOX_FILE_SELECTOR, SAVE_DROPBOX_DOCUMENT, PREFERENCES, RESIZE_CANVAS
} from "@/definitions/modal-windows";
import { FILE_EXTENSIONS } from "@/definitions/image-types";
import { getRectangleForSelection } from "@/math/selection-math";
import ImageToDocumentManager from "@/mixins/image-to-document-manager";
import { getCanvasInstance, runSpriteFn, getSpriteForLayer } from "@/factories/sprite-factory";
import { enqueueState } from "@/factories/history-state-factory";
import LayerFactory from "@/factories/layer-factory";
import { supportsFullscreen, setToggleButton } from "@/utils/environment-util";
import { cloneCanvas } from "@/utils/canvas-util";
import { renderFullSize } from "@/utils/document-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    mixins: [ ImageToDocumentManager ],
    data: () => ({
        activeSubMenu: null, // used for mobile views collapsed / expanded view
        clonedFilters: null,
    }),
    computed: {
        ...mapState([
            "menuOpened",
            "blindActive",
            "selectionContent",
            "dropboxConnected",
        ]),
        ...mapGetters([
            "documents",
            "activeDocument",
            "activeLayer",
            "activeLayerIndex",
            "canUndo",
            "canRedo",
        ]),
        supportsFullscreen,
        noDocumentsAvailable() {
            return !this.activeDocument;
        },
        hasSelection() {
            return this.activeDocument?.selection?.length > 0;
        },
        hasSavedSelections() {
            return Object.keys( this.activeDocument?.selections || {} ).length > 0;
        },
        hasClipboard() {
            return !!this.selectionContent;
        },
    },
    watch: {
        blindActive( isOpen, wasOpen ) {
            if ( !isOpen && wasOpen === true ) {
                this.setMenuOpened( false );
            }
        }
    },
    mounted() {
        if ( this.$refs.fullscreenBtn ) {
            setToggleButton( this.$refs.fullscreenBtn, this.$t( "maximize" ), this.$t( "minimize" ), () => {
                getCanvasInstance()?.rescaleFn();
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
            "setSelectionContent",
            "cropActiveDocumentContent",
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
        ]),
        openSubMenu( name ) {
            this.activeSubMenu = this.activeSubMenu === name ? null : name;
        },
        requestNewDocument() {
            this.openModal( CREATE_DOCUMENT );
        },
        openFileSelector() {
            this.$refs.fileSelector?.click();
        },
        requestImageExport() {
            this.openModal( EXPORT_IMAGE );
        },
        requestDocumentResize() {
            this.openModal( RESIZE_DOCUMENT );
        },
        requestCanvasResize() {
            this.openModal( RESIZE_CANVAS );
        },
        requestDocumentExport() {
            this.openModal( EXPORT_DOCUMENT );
        },
        requestSelectionLoad() {
            this.openModal( LOAD_SELECTION );
        },
        requestSelectionSave() {
            this.openModal( SAVE_SELECTION );
        },
        openPreferences() {
            this.openModal( PREFERENCES );
        },
        requestCropToSelection() {
            const store = this.$store;
            const currentSize = {
                width: this.activeDocument.width,
                height: this.activeDocument.height
            };
            const { left, top, width, height } = getRectangleForSelection( this.activeDocument.selection );
            const commit = async () => {
                await store.commit( "cropActiveDocumentContent", { left, top });
                store.commit( "setActiveDocumentSize", { width, height });
            };
            commit();
            enqueueState("crop", {
                async undo() {
                    await store.commit( "cropActiveDocumentContent", { left: -left, top: -top });
                    store.commit( "setActiveDocumentSize", currentSize );
                },
                redo: commit
            });
        },
        requestDropboxLoad() {
            this.openModal( DROPBOX_FILE_SELECTOR );
        },
        requestDropboxSave() {
            this.openModal( SAVE_DROPBOX_DOCUMENT );
        },
        navigateHistory( action = "undo" ) {
            this.$store.dispatch( action );
        },
        duplicateLayer() {
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
        mergeLayerDown( allLayers = false ) {
            let layers = [];
            let layerIndices = [];
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
            const mergeIndex = allLayers ? 0 : layerIndices[ 0 ];
            const newLayer = LayerFactory.create({
                name: this.$t( "mergedLayer" ),
                source: renderFullSize( this.activeDocument, layerIndices ),
                width: this.activeDocument.width,
                height: this.activeDocument.height
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
        copyLayerFilters() {
            this.clonedFilters = { ...this.activeLayer.filters };
            this.showNotification({ message: this.$t( "filtersCopied" ) });
        },
        pasteLayerFilters() {
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
        selectAll() {
            getCanvasInstance()?.interactionPane.selectAll( this.activeLayer );
        },
        close() {
            this.setMenuOpened( false );
            this.activeSubMenu = null;
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/typography";

$toggle-width: 50px;

.heading {
    letter-spacing: $spacing-xxsmall;

    .emphasis {
        letter-spacing: $spacing-xxsmall / 4;
    }
}

.menu {
    color: #b6b6b6;
    display: block;
    margin: 0 auto;
    padding: $spacing-small $spacing-medium;
    width: 100%;
    background-image: $color-window-bg;
    @include boxSize();

    @include large() {
        min-width: 100%;
        max-width: $ideal-width;
        margin: 0 auto;
        padding-left: $spacing-large;
    }

    @include mobile() {
        height: $menu-height;
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
                    padding: $spacing-small 0;
                }

                a {
                    display: block;
                    width: 100%;
                    padding: $spacing-medium $spacing-large;
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
                    background-color: $color-1;
                }
            }
        }
    }
}

.toggle {
    position: absolute;
    display: none;
    cursor: pointer;
    top: 0;
    left: 0;
    width: $toggle-width;
    height: $menu-height;

    span {
        position: absolute;
        top: 50%;
        left: 50%;
        margin-top: -$spacing-medium;
        margin-left: -$spacing-medium;
    }
}

h1 {
    display: inline;
    margin: 0;
    padding: 0;
    padding-right: $spacing-medium;
    font-size: 110%;
    font-weight: bold;

    .emphasis {
        color: #FFF;
    }
}

.menu-list {
    display: inline;
    list-style-type: none;
    padding: 0;
    margin: 0;
    @include boxSize();

    li {
        display: inline-block;
        padding: 0 $spacing-medium 0 0;
        margin: 0;
        font-family: Montserrat, Helvetica, Verdana;
        cursor: pointer;

        a {
            color: #b6b6b6;
            text-decoration: none;
            padding-bottom: $spacing-large;
            @include customFont();
        }

        &:hover,
        &:hover a {
            color: $color-1;
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

            &:disabled {
                color: #666;
            }
        }

        ul {
            list-style: none;
        }

        @include large() {
            &:hover, &:focus {
                a {
                    color: $color-1;
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
                padding: $spacing-medium;
                background-image: $color-window-bg;
                background-repeat: repeat-x;
                @include boxSize();
            }
        }
    }

    @include mobile() {
        position: absolute;
        top: $menu-height;
        background-image: linear-gradient(to bottom,#fff 35%,#eee 90%);
        background-repeat: repeat-x;
        display: none;

        .title {
            padding: $spacing-small $spacing-medium;
        }

        .submenu {
            display: none;

            &.opened {
                display: block;
                padding-left: $spacing-medium;
                background-image: $color-window-bg;
            }
        }
    }
}

.submenu {
    @include large() {
        li {
            display: block;
            color: #b6b6b6;
            padding: $spacing-xsmall $spacing-medium;

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
    position: absolute;
    top: $spacing-small;
    right: $spacing-medium;
    cursor: pointer;
    @include customFont();

    &:hover {
        color: $color-1;
    }
}
</style>
