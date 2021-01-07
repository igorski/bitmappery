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
    <div>
        <h3 v-t="'layers'"></h3>
        <div
            v-if="reverseLayers.length"
            class="layer-list"
        >
            <div
                v-for="(layer, index) in reverseLayers"
                :key="`layer_${index}`"
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
                    class="name-input"
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
        </div>
        <p
            v-else
            v-t="'noLayers'"
        ></p>
        <div class="actions">
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
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import { ADD_LAYER, LAYER_FILTERS } from "@/definitions/modal-windows";
import { createCanvas } from "@/utils/canvas-util";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import KeyboardService from "@/services/keyboard-service";
import messages from "./messages.json";

export default {
    i18n: { messages },
    data: () => ({
        editable: false,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "activeLayer",
            "activeLayerIndex",
            "activeLayerMask",
            "layers",
        ]),
        reverseLayers() {
            return this.layers?.slice().map(( layer, index ) => ({ ...layer, index })).reverse() ?? [];
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
                    this.$refs.nameInput[0]?.focus();
                });
            }
        },
    },
    methods: {
        ...mapMutations([
            "openModal",
            "removeLayer",
            "updateLayer",
            "setActiveLayerIndex",
            "setActiveLayerMask",
            "openDialog",
        ]),
        requestLayerAdd() {
            this.openModal( ADD_LAYER );
        },
        requestMaskAdd() {
            this.updateLayer({
                index: this.activeLayerIndex,
                opts: {
                    mask: createCanvas( this.activeLayer.width, this.activeLayer.height ).cvs
                }
            });
        },
        handleLayerDoubleClick( index ) {
            this.editable = true;
        },
        updateActiveLayerName({ target }) {
            this.updateLayer({
                index: this.activeLayerIndex,
                opts: {
                    name: target.value
                }
            });
        },
        toggleLayerVisibility( index ) {
            this.updateLayer({
                index,
                opts: {
                    visible: !this.layers[ index ].visible
                }
            });
        },
        handleFiltersClick( index ) {
            this.setActiveLayerIndex( index );
            this.openModal( LAYER_FILTERS );
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
            this.openDialog({
                type: "confirm",
                title: this.$t( "areYouSure" ),
                message: this.$t( "doYouWantToRemoveLayerName", { name: this.layers[ index ]?.name }),
                confirm: () => {
                    this.removeLayer( index );
                }
            });
        },
        requestMaskRemove( index ) {
            this.openDialog({
                type: "confirm",
                title: this.$t( "areYouSure" ),
                message: this.$t( "doYouWantToRemoveMaskName", { name: this.layers[ index ]?.name }),
                confirm: () => {
                    this.updateLayer({ index, opts: { mask: null } });
                }
            });
        },
        handleLayerClick( layer ) {
            this.setActiveLayerIndex( layer.index );
            getSpriteForLayer( layer )?.setActionTarget( "source" );
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
@import "@/styles/typography";
@import "@/styles/options-panel";

h3 {
    color: #FFF;
}

.layer-list {
    padding: $spacing-small 0;
    @include boxSize();
    @include truncate();
    border-top: 1px solid $color-lines;
    border-bottom: 1px solid $color-lines;
}

.layer {
    cursor: pointer;
    border-bottom: 1px dotted $color-lines;
    padding: 0 $spacing-xsmall;
    @include boxSize();
    @include customFont();
    display: flex;

    &:hover,
    &.active {
        background-color: $color-1;
        color: #000;
    }
    &.active {
        border: none;
    }

    .name,
    .name-input {
        flex: 3;
        @include truncate();
        padding: $spacing-small 0 0 $spacing-xsmall;
    }
    .highlight {
        color: #FFF;
        text-decoration: underline;
    }
}

.layer-actions {
    .button {
        width: 30px;
        height: 40px;
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
