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
    <div class="tool-option">
        <h3 v-t="'mirror'"></h3>
        <p v-t="'mirrorLayers'"></p>
        <div class="actions">
            <button
                v-t="'reset'"
                type="button"
                class="button button--small"
                :disabled="!activeLayer || !canReset"
                @click="resetFlip"
            ></button>
            <button
                v-t="'horizontal'"
                type="button"
                class="button button--small"
                :disabled="!activeLayer"
                @click="flipHorizontal"
            ></button>
            <button
                v-t="'vertical'"
                type="button"
                class="button button--small"
                :disabled="!activeLayer"
                @click="flipVertical"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import { mapGetters } from "vuex";
import type { Transform } from "@/definitions/document";
import { enqueueState } from "@/factories/history-state-factory";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapGetters([
            "activeLayer",
            "activeLayerIndex",
            "activeLayerTransform",
        ]),
        canReset(): void {
            const { mirrorX, mirrorY } = this.activeLayer.transform;
            return mirrorX || mirrorY;
        },
    },
    methods: {
        flipHorizontal(): void {
            this.update({ mirrorX: !this.activeLayerTransform.mirrorX }, "mirrorX" );
        },
        flipVertical(): void {
            this.update({ mirrorY: !this.activeLayerTransform.mirrorY }, "mirrorY" );
        },
        resetFlip(): void {
            this.update({ mirrorX: false, mirrorY: false }, "mirrorXY" );
        },
        update( transform: Partial<Transform>, propName = "mirror" ): void {
            const { mirrorX, mirrorY } = this.activeLayerTransform;
            const newTransform = {
                mirrorX,
                mirrorY,
                ...transform,
            };
            const index  = this.activeLayerIndex;
            const store  = this.$store;
            const commit = () => store.commit( "updateLayerTransform", { index, transform: newTransform });
            commit();

            enqueueState( `${propName}_${index}`, {
                undo(): void {
                    store.commit( "updateLayerTransform", { index, transform: { mirrorX, mirrorY } });
                },
                redo: commit,
            });
        }
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/tool-option";
</style>
