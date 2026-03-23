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
            <button
                v-t="'close'"
                type="button"
                class="button"
                @click="closeModal()"
            ></button>
        </template>
    </modal>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import Modal from "@/components/modal/modal.vue";
import { LayerTypes } from "@/definitions/layer-types";
import { createGroupTile, hasTile, getTileForGroup } from "@/rendering/cache/tile-cache";
import { getAllTileGroupsInDocument } from "@/utils/timeline-util";
import { resizeImage } from "@/utils/canvas-util";
import messages from "./messages.json";

const SIZE = 300;

export default {
    i18n: { messages },
    components: {
        Modal,
    },
    data: () => ({
        name: "",
        type: LayerTypes.LAYER_GRAPHIC,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
    },
    mounted(): void {
        this.prepare();
    },
    beforeUnmount(): void {
        this.stopAnimation();
        this.snapshots.length = 0;
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setLoading",
            "unsetLoading",
        ]),
        async prepare(): Promise<void> {
            this.setLoading( "ani" );

            const groups = getAllTileGroupsInDocument( this.activeDocument );
            this.snapshots = [] as HTMLCanvasElement[];

            const { width, height } = this.activeDocument;

            this.tileWidth  = SIZE;
            this.tileHeight = width / height * SIZE;

            const canvas = ( this.$refs.preview as HTMLCanvasElement );
            canvas.width  = this.tileWidth;
            canvas.height = this.tileHeight;

            for ( const id of groups ) {
                if ( !hasTile( id )) {
                    await createGroupTile( id, this.activeDocument );
                }
                let snapshot = getTileForGroup( id );

                if ( snapshot.width > this.tileWidth ) {
                    snapshot = await resizeImage( snapshot, this.tileWidth, this.tileHeight );
                }
                this.snapshots.push( snapshot );
            }
            this.unsetLoading( "ani" );

            this.startAnimation();
        },
        startAnimation(): void {
            const context = ( this.$refs.preview as HTMLCanvasElement ).getContext( "2d" )!;
            let index = 0;
            let max = this.snapshots.length;

            this.interval = window.setInterval(() => {
                context.clearRect( 0, 0, this.tileWidth, this.tileHeight );
                context.drawImage( this.snapshots[ index ], 0, 0, this.tileWidth, this.tileHeight );

                if ( ++index === max ) {
                    index = 0;
                }
            }, 1000 / 10 );
        },
        stopAnimation(): void {
            window.clearInterval( this.interval );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_variables";
@use "@/styles/ui";

.animation-preview-modal {
    @include ui.modalBase( 400px, 360px );
}

.animation-preview {
    text-align: center;

    &__canvas {
        width: 300px;
        height: 300px;
    }
}
</style>