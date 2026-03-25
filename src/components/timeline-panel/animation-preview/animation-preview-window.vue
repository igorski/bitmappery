/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
    <modal class="animation-preview-modal">
        <template #header>
            <h2 v-t="'title'" class="component__title"></h2>
        </template>
        <template #content>
            <div class="animation-preview">
                <canvas
                    ref="preview"
                    class="animation-preview__canvas"
                ></canvas>
            </div>
        </template>
        <template #actions>
            <div class="animation-preview__controls">
                <h2 v-t="'frameRate'"></h2>
                <slider
                    v-model="fps"
                    :min="1"
                    :max="60"
                    :tooltip="'fps'"
                />
            </div>
        </template>
    </modal>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import Modal from "@/components/modal/modal.vue";
import Slider from "@/components/ui/slider/slider.vue";
import { LayerTypes } from "@/definitions/layer-types";
import { scaleToFixedWidth } from "@/math/image-math";
import { renderAnimation } from "@/services/render-animation-service";
import { getPixelRatio, resizeImage } from "@/utils/canvas-util";
import messages from "./messages.json";

const ANIMATION_WIDTH = 300;

export default {
    i18n: { messages },
    components: {
        Modal,
        Slider,
    },
    data: () => ({
        name: "",
        fps: 10,
        type: LayerTypes.LAYER_GRAPHIC,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
    },
    watch: {
        fps( fps: number ): void {
            this.updateMeta({ fps });
            this.renderInterval = 1000 / fps;
        },
    },
    mounted(): void {
        this.fps = this.activeDocument.meta.fps ?? 10;
        this.prepare();
    },
    beforeUnmount(): void {
        this.stopAnimation();
        this.snapshots.length = 0;
    },
    methods: {
        ...mapMutations([
            "setLoading",
            "unsetLoading",
            "updateMeta",
        ]),
        async prepare(): Promise<void> {
            this.setLoading( "ani" );

            this.snapshots = [] as HTMLCanvasElement[];

            const { width, height } = this.activeDocument;

            const tileSize = scaleToFixedWidth( width, height, ANIMATION_WIDTH * getPixelRatio());

            this.tileWidth  = tileSize.width;
            this.tileHeight = tileSize.height;

            const canvas = ( this.$refs.preview as HTMLCanvasElement );
            canvas.width  = this.tileWidth;
            canvas.height = this.tileHeight;

            const renders = await renderAnimation( this.activeDocument );

            for ( const snapshot of renders ) {
                let output = snapshot;
                if ( snapshot.width > this.tileWidth || snapshot.height > this.tileHeight ) {
                    output = await resizeImage( snapshot, this.tileWidth, this.tileHeight );
                }
                this.snapshots.push( output );
            }
            this.unsetLoading( "ani" );

            this.startAnimation();
        },
        startAnimation(): void {
            const context = ( this.$refs.preview as HTMLCanvasElement ).getContext( "2d" )!;

            let index = 0;
            let max = this.snapshots.length;
            this.renderInterval = 1000 / this.fps;
            let lastRender = window.performance.now();

            const requestAniFrame = () => {
                this.interval = window.requestAnimationFrame( update );
            };

            const update = ( now: DOMHighResTimeStamp ) => {
                const delta = now - lastRender;

                requestAniFrame();

                if (( delta / this.renderInterval ) < 0.9 ) {
                    return;
                }
                
                lastRender = now;
                context.clearRect( 0, 0, this.tileWidth, this.tileHeight );
                context.drawImage( this.snapshots[ index ], 0, 0, this.tileWidth, this.tileHeight );

                if ( ++index === max ) {
                    index = 0;
                }
            };
            requestAniFrame();
        },
        stopAnimation(): void {
            window.cancelAnimationFrame( this.interval );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_variables";
@use "@/styles/ui";

.animation-preview-modal {
    @include ui.modalBase( 400px, 360px );
}

.animation-preview {
    display: flex;
    align-items: center;
    height: 100%;
    justify-content: center;

    &__canvas {
        width: 300px; // see ANIMATION_WIDTH
    }

    &__controls {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        border-top: 1px dashed colors.$color-bg;
    }
}
</style>