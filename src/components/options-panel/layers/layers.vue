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
    <div>
        <h3 v-t="'layers'"></h3>
        <div class="layer-list">
            <div
                v-for="(layer, index) in reverseLayers"
                :key="`layer_${index}`"
                class="layer"
                :class="{
                    'active': layer.index === activeLayerIndex
                }"
            >
                <span
                    class="name"
                    @click="handleLayerClick( layer )"
                    :class="{
                        'highlight': layer.index === activeLayerIndex && !activeLayerMask
                    }"
                >{{ layer.name }}</span>
                <span
                    v-if="layer.mask"
                    v-t="'mask'"
                    class="mask"
                    :class="{
                        'highlight': layer.mask === activeLayerMask
                    }"
                    @click="handleLayerMaskClick( layer )"
                ></span>
                <span
                    class="remove"
                    @click="handleRemoveClick( layer.index )"
                >&#215;</span>
            </div>
        </div>
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
import { ADD_LAYER }    from "@/definitions/modal-windows";
import { createCanvas } from "@/utils/canvas-util";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import messages from "./messages.json";

export default {
    i18n: { messages },
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
            getSpriteForLayer( layer ).setActionTarget( "source" );
        },
        handleLayerMaskClick( layer ) {
            this.setActiveLayerMask( layer.index );
            getSpriteForLayer( layer ).setActionTarget( "mask" );
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
    font-size: 80%;
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
        padding: $spacing-xsmall $spacing-xsmall;
        border: none;
    }

    .name {
        flex: 3;
        @include truncate();
    }
    .mask {
        flex: 1;
    }
    .highlight {
        color: #FFF;
    }
}
</style>