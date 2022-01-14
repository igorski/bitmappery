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
    <div
        class="layer-panel-wrapper"
        :class="{ collapsed }"
    >
        <h2
            class="title"
        >{{ showFilters ? $t( 'filtersForLayer', { name: activeLayer.name }) : $t( 'layers' ) }}</h2>
        <button
            type="button"
            class="close-button button--ghost"
            @click="collapsed = !collapsed"
        >
            <img :src="`./assets/icons/icon-${collapsed ? 'expand' : 'collapse'}.svg`" />
        </button>
        <template v-if="!collapsed">
            <layer-filters
                v-if="showFilters"
                @close="showFilters = false"
            />
            <div
                v-else
                class="content form"
            >
                <div
                    v-if="reverseLayers.length"
                    class="layer-list"
                >
                    <draggable v-model="reverseLayers">
                        <div
                            v-for="layer in reverseLayers"
                            :key="layer.id"
                            class="layer"
                            :class="{
                                'active': layer.index === activeLayerIndex
                            }"
                            @dblclick="handleLayerDoubleClick( layer )"
                        >
                            <!-- layer name is an input on double click -->
                            <input
                                v-if="editable && layer.index === activeLayerIndex"
                                ref="nameInput"
                                class="input-field name-input"
                                :value="layer.name"
                                @blur="editable = false"
                                @keyup.enter="editable = false"
                                @change="updateActiveLayerName"
                            />
                            <span
                                v-else
                                v-tooltip="$t( layer.mask && layer.mask === activeLayerMask ? 'clickToEditLayer' : 'dblClickToRename')"
                                class="name"
                                :class="{
                                    'highlight': layer.index === activeLayerIndex && !activeLayerMask
                                }"
                                @click="handleLayerClick( layer )"
                            >{{ layer.name }}</span>
                            <div class="layer-actions">
                                <!-- optional layer mask -->
                                <button
                                    v-if="layer.mask"
                                    v-tooltip="$t('clickToEditMask')"
                                    class="button button--ghost"
                                    :class="{
                                        'highlight': layer.mask === activeLayerMask
                                    }"
                                    @click="handleLayerMaskClick( layer )"
                                ><img src="@/assets/icons/icon-mask.svg" /></button>
                                <button
                                    v-tooltip="$t('toggleVisibility')"
                                    type="button"
                                    class="button button--ghost"
                                    @click="toggleLayerVisibility( layer.index )"
                                    :class="{ 'disabled': !layer.visible }"
                                ><img src="@/assets/icons/icon-eye.svg" /></button>
                                <button
                                    v-tooltip="$t('filters')"
                                    type="button"
                                    class="button button--ghost"
                                    @click="handleFiltersClick( layer.index )"
                                ><img src="@/assets/icons/icon-settings.svg" /></button>
                                <button
                                    v-tooltip="$t( layer.mask ? 'deleteMask' : 'deleteLayer' )"
                                    type="button"
                                    class="button button--ghost"
                                    @click="handleRemoveClick( layer.index )"
                                ><img src="@/assets/icons/icon-trashcan.svg" /></button>
                            </div>
                        </div>
                    </draggable>
                </div>
                <p
                    v-else
                    v-t="'noLayers'"
                ></p>
            </div>
            <div v-if="!showFilters" class="actions">
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

<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import { ADD_LAYER } from "@/definitions/modal-windows";
import { LAYER_TEXT } from "@/definitions/layer-types";
import { PANEL_LAYERS } from "@/definitions/panel-types";
import ToolTypes from "@/definitions/tool-types";
import { createCanvas } from "@/utils/canvas-util";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import { enqueueState } from "@/factories/history-state-factory";
import KeyboardService from "@/services/keyboard-service";
import { focus } from "@/utils/environment-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Draggable    : () => import( "vuedraggable" ),
        LayerFilters : () => import( "@/components/layer-filters/layer-filters" )
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
            "layers",
        ]),
        collapsed: {
            get() {
                return !this.openedPanels.includes( PANEL_LAYERS );
            },
            set( value ) {
                this.setOpenedPanel( PANEL_LAYERS );
            }
        },
        reverseLayers: {
            get() {
                // we like to see the highest layer on top, so reverse order for v-for templating
                return this.layers?.slice().map(( layer, index ) => ({ ...layer, index })).reverse() ?? [];
            },
            set( value ) {
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
        currentLayerHasMask() {
            return !!this.activeLayer?.mask;
        },
    },
    watch: {
        editable( value ) {
            KeyboardService.setSuspended( value );
            if ( value ) {
                this.$nextTick(() => {
                    focus( this.$refs.nameInput[0] );
                });
            }
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
        requestLayerAdd() {
            this.openModal( ADD_LAYER );
        },
        handleLayerDoubleClick( index ) {
            this.editable = true;
        },
        updateActiveLayerName({ target }) {
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
        toggleLayerVisibility( index ) {
            const originalVisibility = this.layers[ index ].visible;
            const store  = this.$store;
            const commit = () => store.commit( "updateLayer", { index, opts: { visible: !originalVisibility } });
            commit();
            enqueueState( `layerVisibility_${index}`, {
                undo() {
                    store.commit( "updateLayer", { index, opts: { visible: originalVisibility } });
                },
                redo: commit,
            });
        },
        handleFiltersClick( index ) {
            this.setActiveLayerIndex( index );
            this.showFilters = true;
        },
        handleRemoveClick( index ) {
            const layer = this.layers[ index ];
            if ( layer.mask ) {
                this.requestMaskRemove( index );
            } else {
                this.requestLayerRemove( index );
            }
        },
        requestLayerRemove( index ) {
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
        requestMaskAdd() {
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
        requestMaskRemove( index ) {
            const mask = this.activeLayer.mask;
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
        handleLayerClick( layer ) {
            this.setActiveLayerIndex( layer.index );
            getSpriteForLayer( layer )?.setActionTarget( "source" );
            /*
            if ( layer.type === LAYER_TEXT ) {
                this.setActiveTool({ tool: ToolTypes.TEXT });
            }
            */
        },
        handleLayerMaskClick( layer ) {
            this.setActiveLayerMask( layer.index );
            getSpriteForLayer( layer )?.setActionTarget( "mask" );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/panel";
@import "@/styles/typography";

.layer-panel-wrapper {
    @include panel();
    display: flex;
    flex-direction: column;

    @include mobile() {
        &.collapsed {
            position: fixed;
            bottom: 0;
            height: $collapsed-panel-height;
        }
    }
}

.layer-list {
    padding: 0;
    @include boxSize();
    @include truncate();
    border-top: 1px solid $color-lines;
}

.layer {
    cursor: pointer;
    border-bottom: 1px dotted $color-lines;
    padding: 0 $spacing-xsmall;
    @include boxSize();
    @include customFont();
    display: flex;

    &:hover {
        background-color: $color-4;
        color: #000;
    }
    &.active {
        background-color: $color-1;
        color: #FFF;
        border: none;
    }

    .name,
    .name-input {
        flex: 3;
        @include truncate();
        font-size: 90%;
        padding: $spacing-small $spacing-small 0;
    }
    .highlight {
        color: #FFF;
    }
}

.layer-actions {
    .button {
        width: 30px;
        height: 32px;
        padding: 0;

        &.disabled {
            opacity: .5;
        }
        img {
            width: 24px;
            vertical-align: middle;
        }
    }
}
</style>
