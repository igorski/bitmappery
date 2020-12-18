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
        </template>
        <div
            ref="canvasContainer"
            class="content"
            :class="{ 'center': centerCanvas }"
        ></div>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import ZoomableCanvas   from "@/components/ui/zcanvas/zoomable-canvas";
import DrawableLayer    from "@/components/ui/zcanvas/drawable-layer";
import { scaleToRatio } from "@/utils/image-math";
import {
    createSpriteForLayer, runSpriteFn, flushLayerSprites, flushCache,
} from "@/factories/sprite-factory";

/* internal non-reactive properties */

let lastDocument;
// maintain a pool of sprites representing the layers within the active document
// the sprites themselves are cached within the sprite-factory, this is merely
// used for change detection in the current editing session (see watchers)
const layerPool = new Map();
// scale of the on-screen canvas relative to the document
let xScale = 1, yScale = 1, zoom = 1, containerSize;

export default {
    data: () => ({
        wrapperHeight: "auto",
        centerCanvas: false,
    }),
    computed: {
        ...mapState([
            "zCanvas",
            "windowSize"
        ]),
        ...mapGetters([
            "activeDocument",
            "layers",
            "activeLayer",
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
            handler( document, oldValue = null ) {
                // no active document or no document content
                if ( !document?.layers ) {
                    if ( this.zCanvas ) {
                        this.zCanvas.dispose();
                        this.setZCanvas( null );
                    }
                    return;
                }
                if ( !this.zCanvas ) {
                    this.createCanvas();
                    this.$nextTick(() => {
                        this.zCanvas.insertInPage( this.$refs.canvasContainer );
                        this.cacheContainerSize();
                        this.scaleCanvas();
                    });
                }
                const { id, width, height } = document;
                // switching between documents
                if ( id !== lastDocument ) {
                    lastDocument = id;
                    flushCache();
                    layerPool.clear();
                }
                if ( this.zCanvas.width !== width || this.zCanvas.height !== height ) {
                    this.scaleCanvas();
                }
            },
        },
        layers: {
            deep: true,
            handler( layers ) {
                const seen = [];
                layers?.forEach( layer => {
                    if ( !layer.visible ) {
                        flushLayerSprites( layer );
                        return;
                    }
                    if ( !layerPool.has( layer.id )) {
                        const sprite = createSpriteForLayer( this.zCanvas, layer, layer === this.activeLayer );
                        layerPool.set( layer.id, sprite );
                    }
                    seen.push( layer.id );
                });
                [ ...layerPool.keys() ].filter( id => !seen.includes( id )).forEach( id => {
                    flushLayerSprites( layerPool.get( id ));
                    layerPool.delete( id );
                });
            },
        },
        activeLayer: {
            handler( layer ) {
                if ( !layer ) {
                    return;
                }
                const { id } = layer;
                [ ...layerPool.entries() ].forEach(([ key, sprite ]) => sprite.setInteractive( key === id ));
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
        ...mapMutations([
            "setZCanvas",
        ]),
        ...mapActions([
            "requestDocumentClose",
        ]),
        createCanvas() {
            // note dimensions will be adjusted by scaleCanvas()
            this.setZCanvas( new ZoomableCanvas({
                width: 100,
                height: 100,
                animate: false,
                smoothing: true,
                stretchToFit: false
            }));
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
            this.zCanvas.setDimensions( width * zoom, height * zoom, true, true ); // replace to not multiply by zoom
            xScale = width / this.activeDocument.width;
            yScale = height / this.activeDocument.height;
            this.zCanvas.setZoomFactor( xScale * zoom, yScale * zoom ); // replace with zCanvas.setZoom()

            this.centerCanvas = this.zCanvas.getWidth() < containerSize.width || this.zCanvas.getHeight() < containerSize.height ;
        },
    },
};
</script>

<style lang="scss">
@import "@/styles/_mixins";
@import "@/styles/component";

.canvas-wrapper {
    display: inline-block;
    width: 100%;
    background: url( "../../assets/images/document_transparent_bg.png" ) repeat fixed;
    @include component();

    .content {
        position: relative;
        padding: 0;
        overflow: auto;
        display: block;

        &.center canvas {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
    }
}
</style>
