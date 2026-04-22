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
    <div
        class="layer-panel-wrapper"
        :class="{ collapsed }"
        @blur="handleBlur()"
        @focusout="handleBlur()"
    >
        <div class="component__header">
            <h2
                class="component__title"
            >{{ title }}</h2>
            <button
                type="button"
                class="component__header-button"
                @click="collapsed = !collapsed"
            >{{ collapsed ? '+' : '-' }}</button>
        </div>
        <template v-if="!collapsed">
            <layer-effects
                v-if="showEffects"
                @close="showEffects = false"
            />
            <div
                v-else
                class="component__content form"
                @click="handleFocus()"
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
                                    'layer--active': isSelectedLayer( element ),
                                    'layer--has-thumb': renderThumbnails,
                                }"
                                @contextmenu.stop.prevent="showContextMenu( $event, element )"
                                @keyup.enter="handleFocus()"
                                tabindex="0"
                            >
                                <!-- thumbnail -->
                                <div
                                    v-if="renderThumbnails"
                                    v-tooltip.left="$t('dragToAdjustOrder')"
                                    class="layer__thumbnail"
                                >
                                    <img
                                        :ref="`thumb_${element.id}`"
                                        :src="getThumbnail( element.id )"
                                    />
                                </div>
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
                                        'layer--selected': isSelectedLayer( element ),
                                    }"
                                    @dblclick="handleLayerDoubleClick( element )"
                                    @click="handleLayerClick( element, $event )"
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
                                        @click="handleToggleLayerVisibility( element.index )"
                                        :class="{ 'layer__actions-button--disabled': !element.visible }"
                                    ><img src="@/assets-inline/images/icon-eye.svg" /></button>
                                    <button
                                        v-tooltip="$t('effectsAndFilters')"
                                        type="button"
                                        class="layer__actions-button button--ghost"
                                        @click="handleEffectsClick( element.index )"
                                    ><img src="@/assets-inline/images/icon-settings.svg" /></button>
                                    <button
                                        v-tooltip="$t( element.mask ? 'deleteMask' : 'deleteLayer' )"
                                        type="button"
                                        class="layer__actions-button button--ghost"
                                        @click="handleRemoveClick( element.index )"
                                        :class="{ 'layer__actions-button--disabled': !canDelete }"
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
            <div v-if="!showEffects" class="component__actions">
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
            <context-menu
                v-if="contextMenu.show"
                @close="contextMenu.show = false"
                :x="contextMenu.x"
                :y="contextMenu.y"
            >
                <layer-menu opened />
            </context-menu>
        </template>
    </div>
</template>

<script lang="ts">
import { defineAsyncComponent } from "vue";
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import { ADD_LAYER } from "@/definitions/modal-windows";
import { PANEL_LAYERS } from "@/definitions/panel-types";
import type { Layer } from "@/definitions/types/document";
import { cutLayerContent } from "@/model/actions/content-cut-layers";
import { removeLayer } from "@/model/actions/layer-remove";
import { renameLayer } from "@/model/actions/layer-rename";
import { reorderLayers } from "@/model/actions/layer-reorder";
import { addMask } from "@/model/actions/mask-add";
import { removeMask } from "@/model/actions/mask-remove";
import { toggleLayerVisibility } from "@/model/actions/layer-toggle-visibility";
import { getRendererForLayer } from "@/model/factories/renderer-factory";
import { getThumbnailForLayer, subscribe, unsubscribe } from "@/rendering/cache/thumbnail-cache";
import { getCanvasInstance } from "@/services/canvas-service";
import KeyboardService from "@/services/keyboard-service";
import { focus } from "@/utils/environment-util";
import { getLayersByTile } from "@/utils/timeline-util";
import messages from "./messages.json";

type IndexedLayer = Layer & { index: number, maskSelected: boolean };

export default {
    i18n: { messages },
    components: {
        ContextMenu  : defineAsyncComponent({ loader: () => import( "@/components/menus/context-menu/context-menu.vue" ) }),
        Draggable    : defineAsyncComponent({ loader: () => import( "vuedraggable" ) }),
        LayerEffects : defineAsyncComponent({ loader: () => import( "@/components/layer-effects/layer-effects.vue" ) }),
        LayerMenu    : defineAsyncComponent({ loader: () => import( "@/components/menus/layer-menu/layer-menu.vue" ) }),
    },
    data: () => ({
        editable: false,
        showEffects: false,
        contextMenu: {
            show: false,
            x: 0,
            y: 0,
        },
        selected: {
            first: undefined,
            last: undefined,
        },
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
            "activeGroup",
            "activeTool",
            "hasSelection",
            "layers",
            "preferences",
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
                let layers = this.layers?.slice() ?? [];
                if ( this.hasTimeline ) {
                    layers = layers.filter( layer => layer.rel.id === this.activeGroup );
                }
                return layers.map(( layer: Layer, index: number ) => ({
                    ...layer,
                    index: this.hasTimeline ? this.layers.indexOf( layer ): index,
                    maskSelected: layer.mask ? layer.mask === this.activeLayerMask : false,
                })).reverse();
            },
            set( value: Layer[] ): void {
                // before updating the model state, we reverse the layers again
                const updatedOrder = value.map(({ id }) => id ).reverse();
                reorderLayers( this.$store, this.activeDocument, updatedOrder );
            }
        },
        currentLayerHasMask(): boolean {
            return !!this.activeLayer?.mask;
        },
        renderThumbnails(): boolean {
            return this.preferences.thumbnails;
        },
        title(): string {
            if ( this.hasTimeline ) {
                return this.$t( "layersForTile", { id: this.activeGroup + 1 });
            }
            if ( this.showEffects && this.activeLayer ) {
                return this.$t( "effectsForLayer", { name: this.activeLayer.name });
            }
            return this.$t( "layers" );
        },
        hasTimeline(): boolean {
            return this.activeDocument?.type === "timeline"
        },
        canDelete(): boolean {
            return !this.hasTimeline || getLayersByTile( this.activeDocument, this.activeGroup ).length > 1; 
        },
    },
    watch: {
        activeTool(): void {
            this.handleBlur();
        },
        layers( _value: Layer[] ): void {
            this.resetSelectedLayers();
        },
    },
    mounted(): void {
        subscribe( "layers", ( layerId: string, data: string ) => {
            const el = this.$refs[ `thumb_${layerId}` ] as HTMLImageElement;
            if ( el ) {
                el.setAttribute( "src", data );
            }
        });
    },
    beforeUnmount(): void {
        unsubscribe( "layers" );
    },
    methods: {
        ...mapActions([
            "requestLayerCopy",
        ]),
        ...mapMutations([
            "openModal",
            "removeLayer",
            "setActiveLayerIndex",
            "setActiveLayerMask",
            "setOpenedPanel",
            "openDialog",
        ]),
        requestLayerAdd(): void {
            this.openModal( ADD_LAYER );
        },
        updateActiveLayerName({ target }: Event ): void {
            const newName = target.value;
            renameLayer( this.$store, this.activeLayer, this.activeLayerIndex, newName );
        },
        handleToggleLayerVisibility( index: number): void {
            toggleLayerVisibility( this.$store, index );
        },
        handleEffectsClick( index: number ): void {
            this.setActiveLayerIndex( index );
            this.showEffects = true;
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
            if ( !this.canDelete ) {
                return;
            }
            const layer = this.layers[ index ];
            this.openDialog({
                type: "confirm",
                title: this.$t( "areYouSure" ),
                message: this.$t( "doYouWantToRemoveLayerName", { name: layer.name }),
                confirm: () => {
                    removeLayer( this.$store, layer, index );
                }
            });
        },
        requestMaskAdd(): void {
            addMask( this.$store, this.activeLayer, this.activeLayerIndex );
        },
        requestMaskRemove( index: number ): void {
            this.openDialog({
                type: "confirm",
                title: this.$t( "areYouSure" ),
                message: this.$t( "doYouWantToRemoveMaskName", { name: this.layers[ index ]?.name }),
                confirm: () => {
                    removeMask( this.$store, this.layers[ index ], index );
                },
            });
        },
        handleLayerDoubleClick( layer: IndexedLayer ): void {
            this.setActiveLayerIndex( layer.index );
            this.setEditable( true );
        },
        handleLayerClick( layer: IndexedLayer, e?: PointerEvent ): void {
            if ( e?.shiftKey ) {
                this.selected.first = Math.min( this.selected.first, layer.index );
                this.selected.last  = Math.max( this.selected.last, layer.index );
                return;
            } else {
                this.selected.first = this.selected.last = layer.index;
            }
            this.setActiveLayerIndex( layer.index );
            getRendererForLayer( layer )?.setActionTarget( "source" );
            if ( KeyboardService.hasAlt() ) {
                this.$nextTick(() => {
                    getCanvasInstance()?.interactionPane.selectAll( this.activeLayer );
                });
            }
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
            this.handleFocus();
        },
        handleFocus(): void {
            KeyboardService.setListener( this.handleKeyboard.bind( this ));
        },
        handleBlur(): void {
            KeyboardService.setListener( null );
            this.resetSelectedLayers();
        },
        handleKeyboard( type: string, keyCode: number, event: KeyboardEvent ): boolean {
            if ( type !== "down" ) {
                return false;
            }
            switch ( keyCode ) {
                default:
                    return false;
                case 8:  // backspace
                case 46: // delete
                    this.requestLayerRemove( this.activeLayerIndex );
                    break;
                case 13: // enter
                    this.handleEffectsClick( this.activeLayerIndex );
                    break;
                case 9: // tab
                    this.handleBlur();
                    break;
                case 27: // escape
                    if ( this.showEffects ) {
                        this.showEffects = false;
                    } else {
                        this.handleBlur();
                    }
                    break;
                case 32: // spacebar
                    this.handleToggleLayerVisibility( this.activeLayerIndex );
                    break;
                case 38: // up
                    const nextUp = Math.min( this.layers.length - 1, this.activeLayerIndex + 1 );
                    if ( event.shiftKey ) {
                        if ( !this.hasSelectedLayers() ) {
                            this.selected.first = this.activeLayerIndex;
                            this.selected.last = nextUp;
                        } else {
                            if ( this.activeLayerIndex === this.selected.last ) {
                                this.selected.last = nextUp;
                            } else {
                                this.selected.first = nextUp;
                            }
                        }
                    } else {
                        this.resetSelectedLayers();
                    }
                    this.setActiveLayerIndex( nextUp );
                    break;
                case 40: // down
                    const nextDown = Math.max( 0, this.activeLayerIndex - 1 );
                    if ( event.shiftKey ) {
                        if ( !this.hasSelectedLayers() ) {
                            this.selected.first = nextDown;
                            this.selected.last = this.activeLayerIndex;
                        } else {
                            if ( this.activeLayerIndex === this.selected.first ) {
                                this.selected.first = nextDown;
                            } else {
                                this.selected.last = nextDown;
                            }
                        }
                    } else {
                        this.resetSelectedLayers();
                    }
                    this.setActiveLayerIndex( nextDown );
                    break;
                case 37: // left
                case 39: // right
                    break;
                case 67: // C
                    if ( !KeyboardService.hasOption( event )) {
                        return false;
                    }
                    this.requestLayerCopy( this.reverseLayers.filter( layer => this.isSelectedLayer( layer )).reverse());
                    break;
                case 88: // X
                    if ( !KeyboardService.hasOption( event )) {
                        return false;
                    }
                    cutLayerContent( this.$store, this.reverseLayers.filter( layer => this.isSelectedLayer( layer )).reverse());
                    this.resetSelectedLayers();
                    break;
            }
            return true;
        },
        async setEditable( value: boolean ): Promise<void> {
            const isEditable = this.editable;
            this.editable = value;

            KeyboardService.setSuspended( value );

            if ( !isEditable && value ) {
                await this.$nextTick(); // allow component to update with input field
                focus( this.$refs.nameInput );
                this.$refs.nameInput?.select();
            } else if ( !value ) {
                this.handleFocus();
            }
        },
        showContextMenu( event: PointerEvent, layer: IndexedLayer ): void {
            if ( this.hasSelectedLayers()) {
                return; // no bulk context actions (yet?)
            }
            if ( !this.isSelectedLayer( layer )) {
                this.handleLayerClick( layer );
            }
            this.contextMenu.show = true;
            this.contextMenu.x = event.clientX;
            this.contextMenu.y = event.clientY;
        },
        getThumbnail( layerId: string ): string {
            return getThumbnailForLayer( layerId );
        },
        isSelectedLayer( layer: IndexedLayer ): boolean {
            const { index } = layer;
            if ( index === this.activeLayerIndex && !layer.maskSelected ) {
                return true;
            }
            return index >= this.selected.first && index <= this.selected.last;
        },
        hasSelectedLayers(): boolean {
            if ( this.selected.first === undefined && this.selected.last === undefined ) {
                return false;
            }
            return this.selected.first !== this.selected.last;
        },
        resetSelectedLayers(): void {
            this.selected.first = this.selected.last = undefined;
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
@use "@/styles/ui";

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
            :deep(.component__content) {
                max-height: 40vh !important;
            }

            &.collapsed {
                position: fixed;
                bottom: 0;
                height: panel.$collapsed-panel-height;
            }
        }
    }

    .component__header-button {
        @include ui.closeButton();

        @include mixins.large() {
            display: none;
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
    font-size: 90%;
}

.layer {
    cursor: pointer;
    border-bottom: 1px solid colors.$color-lines-dark;
    padding: 0 variables.$spacing-xsmall;
    @include mixins.boxSize();
    @include typography.customFont();
    display: flex;
    color: colors.$color-lines;

    &:hover {
        background-color: colors.$color-4;
        color: #000;
    }

    &__thumbnail {
        width: 40px; // see thumbnail-cache.ts
        border: 1px solid colors.$color-lines;
        background: url( "../../assets-inline/images/document_transparent_bg.png" ) repeat;
        
        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    &__name,
    &__name-input {
        flex: 3;
        @include mixins.truncate();
        font-size: 90%;
        padding: variables.$spacing-small 0;
        margin-left: variables.$spacing-small + variables.$spacing-xsmall;
    }
    
    &__name-input {
        padding: variables.$spacing-xsmall;
        margin: variables.$spacing-xsmall 0 variables.$spacing-xsmall variables.$spacing-small;
    }

    &__actions {
        margin: variables.$spacing-xsmall variables.$spacing-xsmall 0 0;

        &-button {
            cursor: pointer;
            width: 22px;
            height: 22px;
            padding: 0;
            filter: brightness(0) invert(0.5);

            &--disabled {
                opacity: .5;
            }

            &--highlight {
                filter: brightness(0) invert(1) !important;
            }

            img {
                width: 18px;
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

    &--has-thumb {
        padding: 0;

        .layer__name {
            padding: variables.$spacing-small variables.$spacing-xsmall;
            margin: 0 variables.$spacing-small;
        }
    }

    @include mixins.mobile() {
        min-height: 44px;
        align-items: center;
    }
}
</style>
