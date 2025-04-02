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
    <div class="tool-option">
        <h3 v-t="'rotation'"></h3>
        <div class="wrapper full slider">
            <slider
                v-model="rotation"
                :min="min"
                :max="max"
                :disabled="!activeLayer"
                :tooltip="'none'"
                @dragStart="pauseCache( true )"
                @dragEnd="pauseCache( false )"
            />
        </div>
        <div class="actions">
            <button
                v-t="'reset'"
                type="button"
                class="button button--small"
                :disabled="!activeLayer || rotation === 0"
                @click="reset()"
            ></button>
            <button
                v-t="'90degLeft'"
                type="button"
                class="button button--small"
                :disabled="!activeLayer"
                @click="rotate(270)"
            ></button>
            <button
                v-t="'flip'"
                type="button"
                class="button button--small"
                :disabled="!activeLayer"
                @click="rotate(180)"
            ></button>
            <button
                v-t="'90degRight'"
                type="button"
                class="button button--small"
                :disabled="!activeLayer"
                @click="rotate(90)"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import Slider from "@/components/ui/slider/slider.vue";
import { pauseBlendCaching } from "@/rendering/cache/blended-layer-cache";
import { rotateLayer } from "@/store/actions/layer-rotate";
import messages from "./messages.json";
import { degreesToRadians, radiansToDegrees } from "@/math/unit-math";

export default {
    i18n: { messages },
    components: {
        Slider,
    },
    data: () => ({
        min: 0,
        max: 360,
    }),
    computed: {
        ...mapGetters([
            "activeLayer",
            "activeLayerIndex",
            "activeLayerEffects",
        ]),
        // note rotation is stored in radians but represented visually as degrees
        rotation: {
            get(): number {
                return radiansToDegrees( this.activeLayerEffects.rotation );
            },
            set( value: number ): void {
                this.update( degreesToRadians( value % 360 ));
            }
        }
    },
    methods: {
        ...mapMutations([
            "updateLayerEffects",
        ]),
        update( rotation: number ): void {
            rotateLayer( this.$store, this.activeLayer, this.activeLayerIndex, rotation );
        },
        reset(): void {
            this.rotation = 0;
        },
        rotate( amountInDegrees: number ): void {
            this.rotation = amountInDegrees;
        },
        pauseCache( paused: boolean ): void {
            pauseBlendCaching( this.activeLayerIndex, paused );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_variables";
@use "@/styles/tool-option";

.actions button {
    margin: 0 variables.$spacing-xxsmall;
}
</style>
