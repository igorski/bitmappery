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
    <ul
        class="submenu"
        :class="{ 'submenu--opened': opened }"
    >
        <li>
            <button
                v-t="'duplicateLayer'"
                type="button"
                :disabled="!activeLayer"
                @click="requestDuplicateLayer()"
            ></button>
        </li>
        <li>
            <button
                v-t="'commitEffects'"
                type="button"
                :disabled="!activeLayerCanBeCommitted"
                @click="commitLayerEffects()"
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
                @click="requestPasteLayerFilters()"
            ></button>
        </li>
        <li>
            <button
                v-t="activeLayerHasFiltersEnabled ? 'disableLayerFilters' : 'enableLayerFilters'"
                v-tooltip.right="$t('toggleLayerFiltersTooltip')"
                type="button"
                :disabled="!activeLayer"
                @click="requestToggleLayerFilters()"
            ></button>
        </li>
        <li>
            <button
                v-t="'mergeDown'"
                type="button"
                :disabled="!activeLayer || activeLayerIndex === 0"
                @click="requestMergeLayerDown()"
            ></button>
        </li>
        <li>
            <button
                v-t="'flattenImage'"
                type="button"
                :disabled="!activeLayer || activeDocument.layers.length < 2"
                @click="requestMergeLayerDown( true )"
            ></button>
        </li>
    </ul>
 </template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import { LayerTypes } from "@/definitions/layer-types";
import { hasFilters } from "@/factories/filters-factory";
import { commitLayerEffectsAndTransforms } from "@/store/actions/layer-commit-effects-and-transforms";
import { duplicateLayer } from "@/store/actions/layer-duplicate";
import { mergeLayerDown } from "@/store/actions/layer-merge-down";
import { pasteLayerFilters } from "@/store/actions/layer-paste-filters";
import { toggleLayerFilters } from "@/store/actions/layer-toggle-filters";
import { hasTransform } from "@/utils/layer-util";

import messages from "./messages.json";

export default {
    i18n: { messages },
    props: {
        opened: {
            type: Boolean,
            default: true,
        },
    },
    computed: {
        ...mapGetters([
            "activeDocument",
            "activeLayer",
            "activeLayerIndex",
            "clonedFilters",
        ]),
        activeLayerCanBeCommitted(): boolean {
            return !!this.activeLayer && ( hasTransform( this.activeLayer ) || hasFilters( this.activeLayer.filters )) && this.activeLayer.type !== LayerTypes.LAYER_TEXT;
        },
        activeLayerHasFiltersEnabled(): boolean {
            return this.activeLayer?.filters?.enabled;
        },
    },
    methods: {
        ...mapMutations([
            "setClonedFilters",
            "showNotification",
        ]),
        requestDuplicateLayer(): void {
            duplicateLayer( this.$store, this.activeLayer, this.activeLayerIndex + 1 );
        },
        commitLayerEffects(): void {
            commitLayerEffectsAndTransforms( this.$store, this.activeDocument, this.activeLayer, this.activeLayerIndex );
        },
        async requestMergeLayerDown( allLayers = false ): Promise<void> {
            await mergeLayerDown( this.$store, this.activeDocument, this.activeLayer, this.activeLayerIndex, this.$t( "mergedLayer" ), allLayers );
        },
        copyLayerFilters(): void {
            this.setClonedFilters({ ...this.activeLayer.filters });
            this.showNotification({ message: this.$t( "filtersCopied" ) });
        },
        requestPasteLayerFilters(): void {
            pasteLayerFilters( this.$store, this.clonedFilters, this.activeLayer, this.activeLayerIndex );
        },
        requestToggleLayerFilters(): void {
            toggleLayerFilters( this.$store, this.activeLayer, this.activeLayerIndex );
        },
    },
}
</script>

<style lang="scss" scoped>
@use "@/styles/ui";

@include ui.nestedMenu();
</style>