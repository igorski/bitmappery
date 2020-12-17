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
                @click="setActiveLayerIndex( layer.index )"
            >{{ layer.name }}</div>
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
                v-t="'removeLayer'"
                type="button"
                class="button button--small"
                :disabled="!activeLayer"
                @click="requestLayerRemove()"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import messages from "./messages.json";
export default {
    i18n: { messages },
    computed: {
        ...mapGetters([
            "activeDocument",
            "activeLayer",
            "activeLayerIndex",
            "layers",
        ]),
        reverseLayers() {
            return this.layers?.slice().map(( layer, index ) => ({ ...layer, index })).reverse() ?? [];
        },
    },
    methods: {
        ...mapMutations([
            "addLayer",
            "removeLayer",
            "setActiveLayerIndex",
        ]),
        requestLayerAdd() {
            this.addLayer({
                name: this.$t( "newLayerNum", { num: this.layers.length + 1 }),
                width: this.activeDocument.width,
                height: this.activeDocument.height
            });
        },
        requestLayerRemove() {
            this.removeLayer( this.activeLayer );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/typography";

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

    &:hover,
    &.active {
        background-color: $color-1;
        color: #FFF;
    }
    &.active {
        padding: $spacing-xsmall $spacing-xsmall;
        border: none;
    }
}

.actions {
    margin-top: $spacing-small;
    display: flex;

    button {
        flex: 1;
        margin: 0 $spacing-small;
    }
}
</style>
