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
    <div class="canvas-wrapper">
        <template v-if="activeDocument">
            <div class="document-name">
                {{ activeDocument.name }}
            </div>
            <div ref="canvasContainer" />
        </template>
    </div>
</template>

<script>
import { mapGetters }     from "vuex";
import { canvas, sprite } from "zcanvas";
import {
    createSpriteForGraphic, flushSpritesInLayer, flushCache,
} from "@/utils/canvas-util";

/* internal methods */

let lastDocument, zCanvas;

export default {
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
    },
    watch: {
        activeDocument: {
            deep: true,
            handler( document ) {
                if ( !document?.layers ) {
                    return;
                }
                const { name, width, height } = document;
                if ( name !== lastDocument ) {
                    lastDocument = name;
                    flushCache(); // switching between documents
                }
                if ( zCanvas.width !== width || zCanvas.height !== height ) {
                    zCanvas.setDimensions( width, height );
                }
                document.layers.forEach( layer => {
                    if ( !layer.visible ) {
                        flushSpritesInLayer( layer );
                        return;
                    }
                    layer.graphics.forEach( graphic => {
                        const sprite = createSpriteForGraphic( zCanvas, graphic );
                    });
                });
            },
        },
    },
    mounted() {
        zCanvas = new canvas({
            width: 160,
            height: 90,
            animate: true,
            smoothing: true,
            backgroundColor: "#FFFFFF",
            stretchToFit: false,
            fps: 60
        });
        zCanvas.insertInPage( this.$refs.canvasContainer );
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

.canvas-wrapper {
    display: inline-block;
    box-shadow: 0 0 5px rgba(0,0,0,.5);
}

.document-name {
    background-image: $color-window-bg;
    padding: $spacing-small $spacing-medium;
    @include boxSize();
    cursor: grab;
}
</style>
