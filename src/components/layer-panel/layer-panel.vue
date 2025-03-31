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
        tabindex="1"
        class="layer-panel-wrapper"
        :class="{ collapsed }"
        @focus="handleFocus()"
        @blur="handleBlur()"
    >
        <div class="component__header">
            <h2
                class="component__title"
            >{{ showFilters && activeLayer ? $t( 'filtersForLayer', { name: activeLayer.name }) : $t( 'layers' ) }}</h2>
            <button
                type="button"
                class="component__header-button button--ghost"
                @click="collapsed = !collapsed"
            >
                <img :src="`assets/images/icon-${collapsed ? 'expand' : 'collapse'}.svg`" />
            </button>
        </div>
        <template v-if="!collapsed">
            <layer-filters
                v-if="showFilters"
                @close="showFilters = false"
            />
            <div
                v-else
                class="component__content form"
            >
                <div
                    v-if="reverseLayers.length"
                    class="layer-list"
                >
                    <draggable
                        v-model="reverseLayers"
                        itemKey="id"
                        @change="handleLayerDrag"
                    >
                        <template #item="{element}">
                            <div
                                class="layer"
                                :class="{
                                    'layer--active': element.index === activeLayerIndex
                                }"
                            >
                                <!-- layer name is an input on double click -->
                                <input
                                    v-if="editable && element.index === activeLayerIndex"
                                    ref="nameInput"
                                    class="input-field layer__name-input"
                                    :value="element.name"
                                    @blur="setEditable( false )"
                                    @keyup.enter="setEditable( false )"
                                    @keyup.esc="setEditable( false )"
                                    @change="updateActiveLayerName"
                                />
                                <span
                                    v-else
                                    v-tooltip.left="$t( element.maskSelected ? 'clickToEditLayer' : 'dblClickToRename')"
                                    class="layer__name"
                                    :class="{
                                        'layer--selected': element.index === activeLayerIndex && !element.maskSelected
                                    }"
                                    @dblclick="handleLayerDoubleClick( element )"
                                    @click="handleLayerClick( element )"
                                >{{ element.name }}</span>
                                <div class="layer__actions">
                                    <!-- optional layer mask -->
                                    <button
                                        v-if="element.mask"
                                        v-tooltip="$t( element.maskSelected ? 'clickToEditLayer' : 'clickToEditMask' )"
                                        class="layer__actions-button button--ghost"
                                        :class="{
                                            'layer__actions-button--highlight': element.maskSelected
                                        }"
                                        @click="handleLayerMaskClick( element )"
                                    ><img src="@/assets-inline/images/icon-mask.svg" /></button>
                                    <button
                                        v-tooltip="$t('toggleVisibility')"
                                        type="button"
                                        class="layer__actions-button button--ghost"
                                        @click="toggleLayerVisibility( element.index )"
                                        :class="{ 'layer__actions-button--disabled': !element.visible }"
                                    ><img src="@/assets-inline/images/icon-eye.svg" /></button>
                                    <button
                                        v-tooltip="$t('filters')"
                                        type="button"
                                        class="layer__actions-button button--ghost"
                                        @click="handleFiltersClick( element.index )"
                                    ><img src="@/assets-inline/images/icon-settings.svg" /></button>
                                    <button
                                        v-tooltip="$t( element.mask ? 'deleteMask' : 'deleteLayer' )"
                                        type="button"
                                        class="layer__actions-button button--ghost"
                                        @click="handleRemoveClick( element.index )"
                                    ><img src="@/assets-inline/images/icon-trashcan.svg" /></button>
                                </div>
                            </div>
                        </template>
                    </draggable>
                </div>
                <p
                    v-else
                    v-t="'noLayers'"
                    class="no-layers-text"
                ></p>
            </div>
            <div v-if="!showFilters" class="component__actions">
                <button
                    v-t="'addLayer'"
                    type="button"
                    class="button button--small"
                    :disabled="!activeDocument"
                    @click="requestLayerAdd()"
                ></button>
                <button
                    v-t="'addMask'"
                    type="button"
                    class="button button--small"
                    :disabled="!activeLayer || currentLayerHasMask"
                    @click="requestMaskAdd()"
                ></button>
            </div>
        </template>
    </div>
</template>

<script lang="ts">
import { defineAsyncComponent } from "vue";
import { mapState, mapGetters, mapMutations } from "vuex";
import { ADD_LAYER } from "@/definitions/modal-windows";
import { PANEL_LAYERS } from "@/definitions/panel-types";
import ToolTypes from "@/definitions/tool-types";
import type { Layer } from "@/definitions/types/document";
import { createCanvas } from "@/utils/canvas-util";
import { toggleLayerVisibility } from "@/store/actions/toggle-layer-visibility";
import { getRendererForLayer } from "@/factories/renderer-factory";
import { enqueueState } from "@/factories/history-state-factory";
import { getCanvasInstance } from "@/services/canvas-service";
import KeyboardService from "@/services/keyboard-service";
import { focus } from "@/utils/environment-util";
import messages from "./messages.json";

const NON_OVERRIDABLE_TOOLS = [ ToolTypes.MOVE, ToolTypes.DRAG ];

type IndexedLayer = Layer & { index: number, maskSelected: boolean };

export default {
    i18n: { messages },
    components: {
        Draggable    : defineAsyncComponent({ loader: () => import( "vuedraggable" ) }),
        LayerFilters : defineAsyncComponent({ loader: () => import( "@/components/layer-filters/layer-filters.vue" ) }),
    },
    data: () => ({
        editable: false,
        showFilters: false,
    }),
    computed: {
        ...mapState([
            "openedPanels",
        ]),
        ...mapGetters([
            "activeDocument",
            "activeLayer",
            "activeLayerIndex",
            "activeLayerMask",
            "activeTool",
            "hasSelection",
            "layers",
        ]),
        collapsed: {
            get(): boolean {
                return !this.openedPanels.includes( PANEL_LAYERS );
            },
            set(): void {
                this.setOpenedPanel( PANEL_LAYERS );
            }
        },
        reverseLayers: {
            get(): IndexedLayer[] {
                // we like to see the highest layer on top, so reverse order for v-for templating
                return this.layers?.slice().map(( layer, index ) => ({
                    ...layer,
                    index,
                    maskSelected: layer.mask ? layer.mask === this.activeLayerMask : false,
                })).reverse() ?? [];
            },
            set( value: Layer[] ): void {
                // when updating the Vuex store, we reverse the layers again
                const originalOrder = this.reverseLayers.map(({ id }) => id ).reverse();
                const updatedOrder  = value.map(({ id }) => id ).reverse();

                const document = this.activeDocument;
                const store    = this.$store;
                const commit = () => {
                    store.commit( "reorderLayers", { document, layerIds: updatedOrder } );
                }
                commit();
                enqueueState( `reorderLayers_${updatedOrder.join()}`, {
                    undo() {
                        store.commit( "reorderLayers", { document, layerIds: originalOrder });
                    },
                    redo: commit,
                });
            }
        },
        currentLayerHasMask(): boolean {
            return !!this.activeLayer?.mask;
        },
        overrideCustomKeyHandler(): boolean {
            return this.hasSelection || NON_OVERRIDABLE_TOOLS.includes( this.activeTool );
        },
    },
    methods: {
        ...mapMutations([
            "openModal",
            "removeLayer",
            "setActiveLayerIndex",
            "setActiveLayerMask",
            "setActiveTool",
            "setOpenedPanel",
            "openDialog",
        ]),
        requestLayerAdd(): void {
            this.openModal( ADD_LAYER );
        },
        updateActiveLayerName({ target }): void {
            const newName     = target.value;
            const currentName = this.activeLayer.name;
            const index       = this.activeLayerIndex;
            const store  = this.$store;
            const commit = () => store.commit( "updateLayer", { index, opts: { name: newName } });
            commit();
            enqueueState( `layerName_${index}`, {
                undo() {
                    store.commit( "updateLayer", { index, opts: { name: currentName } });
                },
                redo: commit,
            });
        },
        toggleLayerVisibility( index: number): void {
            toggleLayerVisibility( this.$store, index );
        },
        handleFiltersClick( index: number ): void {
            this.setActiveLayerIndex( index );
            this.showFilters = true;
        },
        handleRemoveClick( index: number ): void {
            const layer = this.layers[ index ];
            if ( layer.mask ) {
                this.requestMaskRemove( index );
            } else {
                this.requestLayerRemove( index );
            }
        },
        requestLayerRemove( index: number ): void {
            const layer = this.layers[ index ];
            this.openDialog({
                type: "confirm",
                title: this.$t( "areYouSure" ),
                message: this.$t( "doYouWantToRemoveLayerName", { name: layer.name }),
                confirm: () => {
                    const store  = this.$store;
                    const commit = () => store.commit( "removeLayer", index );
                    commit();
                    enqueueState( `layerRemove_${index}`, {
                        undo() {
                            store.commit( "insertLayerAtIndex", { index, layer });
                        },
                        redo: commit,
                    });
                }
            });
        },
        requestMaskAdd(): void {
            const index   = this.activeLayerIndex;
            const mask    = createCanvas( this.activeLayer.width, this.activeLayer.height ).cvs;
            const curMask = this.activeLayerMask;
            const store   = this.$store;
            const commit  = () => {
                store.commit( "updateLayer", { index, opts: { mask } });
                store.commit( "setActiveLayerMask", index );
            };
            commit();
            enqueueState( `maskAdd_${index}`, {
                undo() {
                    store.commit( "updateLayer", { index, opts: { mask: null } });
                    store.commit( "setActiveLayerMask", curMask );
                },
                redo: commit,
            });
        },
        requestMaskRemove( index: number ): void {
            const mask = this.layers[ index ].mask;
            this.openDialog({
                type: "confirm",
                title: this.$t( "areYouSure" ),
                message: this.$t( "doYouWantToRemoveMaskName", { name: this.layers[ index ]?.name }),
                confirm: () => {
                    const store  = this.$store;
                    const commit = () => store.commit( "updateLayer", { index, opts: { mask: null } });
                    commit();
                    enqueueState( `maskRemove_${index}`, {
                        undo() {
                            store.commit( "updateLayer", { index, opts: { mask } });
                        },
                        redo: commit,
                    });
                }
            });
        },
        handleLayerDoubleClick( layer: IndexedLayer ): void {
            this.setActiveLayerIndex( layer.index );
            this.setEditable( true );
        },
        handleLayerClick( layer: IndexedLayer ): void {
            this.setActiveLayerIndex( layer.index );
            getRendererForLayer( layer )?.setActionTarget( "source" );
            if ( KeyboardService.hasAlt() ) {
                this.$nextTick(() => {
                    getCanvasInstance()?.interactionPane.selectAll( this.activeLayer );
                });
            }
            /*
            if ( layer.type === LAYER_TEXT ) {
                this.setActiveTool({ tool: ToolTypes.TEXT });
            }
            */
        },
        handleLayerMaskClick( layer: IndexedLayer ): void {
            if ( layer.maskSelected ) {
                this.handleLayerClick( layer ); // unsetting of mask
                return;
            }
            this.setActiveLayerMask( layer.index );
            getRendererForLayer( layer )?.setActionTarget( "mask" );
        },
        handleLayerDrag( dragEvent: { moved: { element: Layer, newIndex: number, oldIndex: number }}): void {
            const layer = dragEvent.moved.element;
            this.setActiveLayerIndex( this.layers.findIndex(({ id }) => id === layer.id ));
        },
        handleFocus(): void {
            KeyboardService.setListener( this.handleKeyboard.bind( this ), false );
        },
        handleBlur(): void {
            KeyboardService.setListener( null );
        },
        handleKeyboard( type: string, keyCode: number, event: Event ): void {
            if ( type !== "up" || this.overrideCustomKeyHandler ) {
                return;
            }
            switch ( keyCode ) {
                default:
                    return;
                case 8:  // backspace
                case 46: // delete
                    this.requestLayerRemove( this.activeLayerIndex );
                    break;
                case 13: // enter
                    this.handleFiltersClick( this.activeLayerIndex );
                    break;
                case 27: // escape
                    this.setEditable( false );
                    this.showFilters = false;
                    break;
                case 32: // spacebar
                    this.toggleLayerVisibility( this.activeLayerIndex );
                    break;
                case 38: // up
                    this.setActiveLayerIndex( Math.min( this.layers.length - 1, this.activeLayerIndex + 1 ));
                    break;
                case 40: // down
                    this.setActiveLayerIndex( Math.max( 0, this.activeLayerIndex - 1 ));
                    break;
            }
            event.preventDefault();
        },
        async setEditable( value: boolean ): Promise<void> {
            const isEditable = this.editable;
            this.editable = value;

            KeyboardService.setSuspended( value );

            if ( !isEditable && value ) {
                await this.$nextTick(); // allow component to update with input field
                focus( this.$refs.nameInput );
                this.$refs.nameInput?.select();
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/panel";
@use "@/styles/typography";

.layer-panel-wrapper {
    @include panel.panel();

    & {
        display: flex;
        flex-direction: column;

        &:focus {
            outline: none;
        }

        :deep(.component__content) {
            padding: 0;
        }

        @include mixins.mobile() {
            &.collapsed {
                position: fixed;
                bottom: 0;
                height: panel.$collapsed-panel-height;
            }
        }
    }
}

.layer-list {
    padding: 0;
    @include mixins.boxSize();
    @include mixins.truncate();
}

.no-layers-text {
    padding: 0 variables.$spacing-medium;
}

.layer {
    cursor: pointer;
    border-bottom: 1px dotted colors.$color-lines;
    padding: 0 variables.$spacing-xsmall;
    @include mixins.boxSize();
    @include typography.customFont();
    display: flex;
    color: colors.$color-lines;

    &:hover {
        background-color: colors.$color-4;
        color: #000;
    }

    &__name,
    &__name-input {
        flex: 3;
        @include mixins.truncate();
        font-size: 90%;
        padding: variables.$spacing-small variables.$spacing-small 0;
        margin-left: variables.$spacing-small;
    }
    
    &__name-input {
        padding-top: 0;
    }

    &__actions {
        margin-right: variables.$spacing-small;

        &-button {
            cursor: pointer;
            width: 30px;
            height: 32px;
            padding: 0;
            filter: brightness(0) invert(0.5);

            &--disabled {
                opacity: .5;
            }

            &--highlight {
                filter: brightness(0) invert(1) !important;
            }

            img {
                width: 24px;
                vertical-align: middle;
            }
        }
    }

    &--active {
        background-color: colors.$color-1;
        border-bottom-color: transparent;
        color: colors.$color-2;
    }

    &--active,
    &:hover {
        .layer__actions-button {
            filter: none;
        }
    }

    &--selected {
        color: #FFF;
    }
}
</style>
