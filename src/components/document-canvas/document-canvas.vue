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
    <div
        class="canvas-wrapper"
        :style="{ 'height': wrapperHeight }"
    >
        <template v-if="activeDocument">
            <h2>{{ activeDocument.name }}</h2>
            <button
                type="button"
                class="close-button"
                @click="requestDocumentClose()"
            >&#215;</button>
            <div class="content" ref="canvasContainer"></div>
        </template>
    </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import ZoomableCanvas   from "@/components/ui/zcanvas/zoomable-canvas";
import DrawableLayer    from "@/components/ui/zcanvas/drawable-layer";
import { scaleToRatio } from "@/utils/image-math";
import {
    createSpriteForGraphic, runSpriteFn, flushSpritesInLayer, flushCache,
} from "@/utils/canvas-util";

/* internal non-reactive properties */

let lastDocument, zCanvas, drawableLayer;
// scale of the on-screen canvas relative to the document
let xScale = 1, yScale = 1, zoom = 1, containerSize;

export default {
    data: () => ({
        wrapperHeight: "auto"
    }),
    computed: {
        ...mapState([
            "windowSize"
        ]),
        ...mapGetters([
            "activeDocument",
            "activeTool",
            "zoomOptions",
        ]),
    },
    watch: {
        windowSize() {
            this.cacheContainerSize();
            this.scaleCanvas();
        },
        activeDocument: {
            deep: true,
            handler( document, oldValue = null ) {
                if ( !document?.layers ) {
                    if ( zCanvas ) {
                        zCanvas.dispose();
                        zCanvas = null;
                    }
                    return;
                }
                if ( !zCanvas ) {
                    this.createCanvas();
                    this.$nextTick(() => {
                        zCanvas.insertInPage( this.$refs.canvasContainer );
                        this.cacheContainerSize();
                    });
                }
                const { name, width, height } = document;
                if ( name !== lastDocument ) {
                    lastDocument = name;
                    flushCache(); // switching between documents
                }
                if ( zCanvas.width !== width || zCanvas.height !== height ) {
                    this.scaleCanvas();
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
        activeTool( tool ) {
            let isDraggable = false; // sprites only draggable for move tool
            switch ( tool ) {
                default:
                    break;
                case "move":
                    isDraggable = true;
                    break;
                case "brush":
                    if ( !drawableLayer ) {
                        drawableLayer = new DrawableLayer( this.activeDocument );
                        zCanvas.addChild( drawableLayer );
                    }
                    break;
            }
            runSpriteFn( sprite => sprite.setDraggable( isDraggable || sprite instanceof DrawableLayer ));
        },
        zoomOptions: {
            deep: true,
            handler({ level }) {
                zoom = level;

                // cache the current scroll offset so we can zoom from the current offset
                let { scrollLeft, scrollTop, scrollWidth, scrollHeight } = this.$refs.canvasContainer;
                let ratioX = scrollLeft / scrollWidth;
                let ratioY = scrollTop / scrollHeight;

                this.scaleCanvas();

                // maintain relative scroll offset after rescale
                ({ scrollWidth, scrollHeight } = this.$refs.canvasContainer );
                this.$refs.canvasContainer.scrollLeft = scrollWidth  * ratioX;
                this.$refs.canvasContainer.scrollTop  = scrollHeight * ratioY;
            }
        },
    },
    mounted() {
        this.cacheContainerSize();
    },
    methods: {
        ...mapActions([
            "requestDocumentClose",
        ]),
        createCanvas() {
            zCanvas = new ZoomableCanvas({
                width: 160,
                height: 90,
                animate: false,
                smoothing: true,
                backgroundColor: "red",
                stretchToFit: false
            });
        },
        cacheContainerSize() {
            containerSize = this.$el.parentNode?.getBoundingClientRect();
        },
        /**
         * Ensure the canvas fills out the available space while also maintaining
         * the ratio of the document is is representing.
         */
        scaleCanvas() {
            if ( !this.activeDocument ) {
                return;
            }
            let { width, height } = this.activeDocument;
            ({ width, height } = scaleToRatio( width, height, containerSize.width, containerSize.height ));
            this.wrapperHeight = `${window.innerHeight - containerSize.top - 20}px`;
            zCanvas.setDimensions( width * zoom, height * zoom, true, true );
            xScale = width / this.activeDocument.width;
            yScale = height / this.activeDocument.height;
            zCanvas.setZoomFactor( xScale * zoom, yScale * zoom );
        //    zCanvas.setZoomFactor(( width / this.activeDocument.width ) * this.xScale, ( height / this.activeDocument.height ) * this.yScale );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/component";

.canvas-wrapper {
    display: inline-block;
    width: 100%;
    @include component();

    .content {
        padding: 0;
        overflow: auto;
        display: block;
    }
}
</style>
