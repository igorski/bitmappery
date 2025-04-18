/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
        <h3 v-t="'scale'"></h3>
        <div class="wrapper full slider">
            <slider
                v-model="scale"
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
                :disabled="!activeLayer || !isScaled"
                @click="reset()"
            ></button>
            <button
                v-if="isSaveable"
                v-t="'save'"
                type="button"
                class="button button--small"
                :disabled="!isScaled"
                @click="save()"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import { mapGetters } from "vuex";
import { MIN_ZOOM, MAX_ZOOM } from "@/definitions/tool-types";
import { LayerTypes } from "@/definitions/layer-types";
import Slider from "@/components/ui/slider/slider.vue";
import { enqueueState } from "@/factories/history-state-factory";
import { getRendererForLayer } from "@/factories/renderer-factory";
import { scale } from "@/math/unit-math";
import { pauseBlendCaching } from "@/rendering/cache/blended-layer-cache";
import { cloneCanvas, resizeImage } from "@/utils/canvas-util";
import messages  from "./messages.json";

const SAVEABLE_TYPES = [ LayerTypes.LAYER_GRAPHIC, LayerTypes.LAYER_IMAGE ];

export default {
    i18n: { messages },
    components: {
        Slider,
    },
    data: () => ({
        min: MIN_ZOOM,
        max: MAX_ZOOM,
    }),
    computed: {
        ...mapGetters([
            "activeLayer",
            "activeLayerIndex",
            "activeLayerTransform",
        ]),
        scale: {
            get(): number {
                return ( this.activeLayerTransform.scale - 1 ) * MAX_ZOOM;
            },
            set( value: number ): void {
                this.update( scale( value, MAX_ZOOM, 1 ) + 1 );
            }
        },
        isScaled(): boolean {
            return this.activeLayerTransform.scale !== 1;
        },
        isSaveable(): boolean {
            return SAVEABLE_TYPES.includes( this.activeLayer?.type );
        },
    },
    methods: {
        update( scale: number ): void {
            const oldScale = this.activeLayerTransform.scale;
            const index  = this.activeLayerIndex;
            const store  = this.$store;
            const commit = () => {
                store.commit( "updateLayerTransform", { index, transform: { scale } });
            };
            commit();
            enqueueState( `scale_${index}`, {
                undo() {
                    store.commit( "updateLayerTransform", { index, transform: { scale: oldScale } });
                },
                redo: commit
            });
        },
        async save(): Promise<void> {
            const { activeLayer } = this;
            const { left, top, width, height } = activeLayer;
            const { scale } = activeLayer.transform;
            const index = this.activeLayerIndex;
            const store = this.$store;
            const orgImage = cloneCanvas( this.activeLayer.source );

            // when saving a scale layer, we crop the image to the visible area (equals layer size)
            const targetWidth = orgImage.width;
            const targetHeight = orgImage.height;
            const sourceWidth = targetWidth / scale;
            const sourceHeight = targetHeight / scale;
            const offsetX = (( targetWidth - sourceWidth ) / 2 ) - ( left / scale );
            const offsetY = (( targetHeight - sourceHeight ) / 2 ) - ( top / scale );

            const scaledImage = await resizeImage(
                orgImage, targetWidth, targetHeight,
                offsetX, offsetY,
                sourceWidth, sourceHeight
            );

            const commit = () => {
                store.commit( "updateLayer", { index, opts: { source: scaledImage, left: 0, top: 0, width: targetWidth, height: targetHeight } });
                // unset layer scale (the resized image should display at a reset scale)
                store.commit( "updateLayerTransform", { index, transform: { scale: 1 } });
                getRendererForLayer( activeLayer )?.syncPosition();
            };
            commit();
            enqueueState( `saveScale_${scale}`, {
                undo() {
                    store.commit( "updateLayer", { index, opts: { source: orgImage, left, top, width, height } });
                    store.commit( "updateLayerTransform", { index, transform: { scale } });
                    getRendererForLayer( activeLayer )?.syncPosition();
                },
                redo: commit,
            })
        },
        reset(): void {
            this.scale = 0;
        },
        pauseCache( paused: boolean ): void {
            pauseBlendCaching( this.activeLayerIndex, paused );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/tool-option";
</style>
