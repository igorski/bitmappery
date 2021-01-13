/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
            <div
                ref="canvasContainer"
                class="content"
                :class="{ 'center': centerCanvas }"
            ></div>
            <scrollbars
                v-if="activeDocument"
                ref="scrollbars"
                :content-width="cvsWidth"
                :content-height="cvsHeight"
                :viewport-width="viewportWidth"
                :viewport-height="viewportHeight"
                @input="panViewport"
            />
        </template>
        <file-import v-else />
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import ZoomableCanvas from "@/components/ui/zcanvas/zoomable-canvas";
import FileImport from "@/components/file-import/file-import";
import { MODE_PAN, MODE_LAYER_SELECT, MODE_SELECTION } from "@/components/ui/zcanvas/interaction-pane";
import Scrollbars from "./scrollbars/scrollbars";
import ToolTypes, { MAX_ZOOM, calculateMaxScaling, usesInteractionPane } from "@/definitions/tool-types";
import { scaleToRatio, scaleValue } from "@/math/image-math";
import { isMobile } from "@/utils/environment-util";
import {
    getCanvasInstance, setCanvasInstance,
    createSpriteForLayer, getSpriteForLayer, flushLayerSprites, flushCache as flushSpriteCache,
} from "@/factories/sprite-factory";
import { flushCache as flushBitmapCache } from "@/services/caches/bitmap-cache";

/* internal non-reactive properties */

const mobileView = isMobile();
let lastDocument, containerSize, interactionPane;
// maintain a pool of sprites representing the layers within the active document
// the sprites themselves are cached within the sprite-factory, this is merely
// used for change detection in the current editing session (see watchers)
const layerPool = new Map();
// scale of the on-screen canvas relative to the document
let xScale = 1, yScale = 1, zoom = 1, maxInScale = 1, maxOutScale = 1;

export default {
    components: {
        Scrollbars,
        FileImport,
    },
    data: () => ({
        wrapperHeight: "100%",
        centerCanvas: false,
        cvsWidth: 100,
        cvsHeight: 100,
        viewportWidth: 100,
        viewportHeight: 100,
    }),
    computed: {
        ...mapState([
            "windowSize",
            "panMode",
            "layerSelectMode",
            "selectMode",
        ]),
        ...mapGetters([
            "activeDocument",
            "layers",
            "activeLayer",
            "activeTool",
            "zoomOptions",
            "zCanvasBaseDimensions",
        ]),
    },
    watch: {
        windowSize() {
            this.calcIdealDimensions();
        },
        activeDocument: {
            handler( document, oldValue = null ) {
                // no active document or no document content
                if ( !document?.layers ) {
                    if ( getCanvasInstance() ) {
                        getCanvasInstance().dispose();
                        setCanvasInstance( null );
                    }
                    return;
                }
                if ( !getCanvasInstance() ) {
                    const zCanvas = this.createCanvas();
                    this.$nextTick(() => {
                        zCanvas.insertInPage( this.$refs.canvasContainer );
                        this.calcIdealDimensions();
                    });
                }
                const { id } = document;
                // switching between documents
                if ( id !== lastDocument ) {
                    this.resetHistory();
                    lastDocument = id;
                    flushSpriteCache();
                    flushBitmapCache();
                    layerPool.clear();
                    this.calcIdealDimensions();
                    this.$nextTick(() => {
                        this.setActiveTool({ tool: this.activeTool || ToolTypes.MOVE, document: this.activeDocument });
                    });
                }
            }
        },
        layers: {
            deep: true,
            handler( layers ) {
                const seen    = [];
                const zCanvas = getCanvasInstance();
                layers?.forEach( layer => {
                    if ( !layer.visible ) {
                        flushLayerSprites( layer );
                        return;
                    }
                    if ( !layerPool.has( layer.id )) {
                        const sprite = createSpriteForLayer( zCanvas, layer, layer === this.activeLayer );
                        layerPool.set( layer.id, sprite );
                    }
                    seen.push( layer.id );
                });
                [ ...layerPool.keys() ].filter( id => !seen.includes( id )).forEach( id => {
                    flushLayerSprites( layerPool.get( id ));
                    layerPool.delete( id );
                });
                // ensure the visible layers are at right position in display list
                layers?.filter(({ visible }) => visible ).forEach( layer => {
                    const sprite = getSpriteForLayer( layer );
                    zCanvas.removeChild( sprite );
                    zCanvas.addChild( sprite );
                });
                zCanvas?.interactionPane.stayOnTop();
            },
        },
        activeLayer: {
            handler( layer ) {
                if ( !layer ) {
                    return;
                }
                const { id } = layer;
                [ ...layerPool.entries() ].forEach(([ key, sprite ]) => {
                    sprite.handleActiveLayer( layer );
                });
            },
        },
        activeTool( tool ) {
            if ( usesInteractionPane( tool )) {
                this.setPanMode( tool === ToolTypes.MOVE );
                this.setSelectMode([ ToolTypes.SELECTION, ToolTypes.LASSO ].includes( tool ));
                this.updateInteractionPane();
            } else {
                this.handleCursor();
                getCanvasInstance()?.interactionPane.setInteractive( false );
            }
        },
        zoomOptions: {
            deep: true,
            handler({ level }) {
                // are we zooming in or out (relative from the base, not necessarily the previous value)
                if ( level > 0 ) {
                    zoom = scaleValue( level, MAX_ZOOM, maxInScale - 1 ) + 1;
                } else {
                    zoom = 1 - scaleValue( Math.abs( level ), MAX_ZOOM, 1 - ( 1 / maxOutScale ));
                }
                // rescale canvas, note we omit the best fit calculation as we zoom from the calculated base
                this.scaleCanvas( false );
            }
        },
        panMode( value ) {
            this.updateInteractionPane( "cursor-drag" );
        },
        layerSelectMode( value ) {
            this.updateInteractionPane();
        },
        selectMode( value ) {
            this.updateInteractionPane();
        },
    },
    async mounted() {
        await this.$nextTick();
        this.cacheContainerSize();
        this.scaleWrapper();
    },
    methods: {
        ...mapMutations([
            "setZCanvasBaseDimensions",
            "setPanMode",
            "setSelectMode",
            "setActiveTool",
            "resetHistory",
        ]),
        ...mapActions([
            "requestDocumentClose",
        ]),
        createCanvas() {
            // note dimensions will be adjusted by scaleCanvas()
            const zCanvas = new ZoomableCanvas({
                width: this.cvsWidth,
                height: this.cvsHeight,
                animate: false,
                smoothing: true,
                stretchToFit: false,
                viewport: {
                    width  : this.viewportWidth,
                    height : this.viewportHeight
                },
                handler: this.handleCanvasEvent.bind( this ),
            }, this.$store, this.calcIdealDimensions );
            setCanvasInstance( zCanvas );
            return zCanvas;
        },
        cacheContainerSize() {
            containerSize = this.$el.parentNode?.getBoundingClientRect();
            if ( mobileView ) {
                containerSize.height -= 40; // collapsed options panel height
            }
        },
        /**
         * Scales the canvas to dimensions corresponding to document size and zoom.
         * When calculateBestFit is true, this ensures the canvas fills out the available
         * space while also maintaining the ratio of the document is is representing.
         * This resulting value is used as the baseline for the unzoomed level. This
         * should be recalculated on window resize.
         */
        scaleCanvas( calculateBestFit = true ) {
            if ( !this.activeDocument ) {
                return;
            }
            const zCanvas = getCanvasInstance();
            if ( calculateBestFit ) {
                const { width, height } = this.activeDocument;
                const scaledSize = scaleToRatio( width, height, containerSize.width, containerSize.height );
                this.setZCanvasBaseDimensions( scaledSize );
                xScale = scaledSize.width  / this.activeDocument.width;
                yScale = scaledSize.height / this.activeDocument.height;
                const maxScaling = calculateMaxScaling( scaledSize.width, scaledSize.height, width, containerSize.width );
                maxInScale  = maxScaling.in;
                maxOutScale = maxScaling.out;
                this.viewportWidth  = containerSize.width;
                this.viewportHeight = containerSize.height;
                zCanvas.setViewport( this.viewportWidth, this.viewportHeight );
            }
            this.scaleWrapper();
            // replace below with updated zCanvas lib to not multiply by zoom
            this.cvsWidth  = this.zCanvasBaseDimensions.width  * zoom;
            this.cvsHeight = this.zCanvasBaseDimensions.height * zoom;
            zCanvas.setDocumentScale( this.cvsWidth, this.cvsHeight, xScale, zoom, this.activeDocument );
            this.centerCanvas = zCanvas.getWidth() < containerSize.width || zCanvas.getHeight() < containerSize.height ;
        },
        scaleWrapper() {
            if ( !mobileView ) {
                this.wrapperHeight = `${window.innerHeight - containerSize.top - 20}px`;
            }
        },
        calcIdealDimensions() {
            this.cacheContainerSize();
            this.scaleCanvas();
        },
        panViewport({ left, top }) {
            getCanvasInstance().panViewport(
                Math.round( left * ( this.cvsWidth  - this.viewportWidth )),
                Math.round( top  * ( this.cvsHeight - this.viewportHeight ))
            );
        },
        handleCanvasEvent({ type, value }) {
            switch ( type ) {
                default:
                    break;
                // internal zCanvas event has panned the viewport, update the scrollbars accordingly
                case "panned":
                    this.$refs.scrollbars?.update(
                        value.left / ( this.cvsWidth  - this.viewportWidth ),
                        value.top  / ( this.cvsHeight - this.viewportHeight )
                    );
                    break;
            }
        },
        handleCursor() {
            const canvasClasses = getCanvasInstance()?.getElement().classList;
            if ( !canvasClasses ) {
                return;
            }
            canvasClasses.remove( ...canvasClasses );
            switch ( this.activeTool ) {
                default:
                    break;
                case ToolTypes.MOVE:
                case ToolTypes.DRAG:
                    canvasClasses.add( "cursor-drag" );
                    break;
                case ToolTypes.BRUSH:
                case ToolTypes.CLONE:
                case ToolTypes.ERASER:
                    canvasClasses.add( "no-cursor" );
                    break;
                case ToolTypes.EYEDROPPER:
                    canvasClasses.add( "cursor-crosshair" );
                    break;
            }
        },
        updateInteractionPane( pointerStyle = "cursor-pointer" ) {
            const zCanvas = getCanvasInstance();
            if ( zCanvas ) {
                const enabled = this.panMode || this.layerSelectMode || this.selectMode;
                let mode;
                if ( this.panMode ) {
                    mode = MODE_PAN;
                } else if ( this.layerSelectMode ) {
                    mode = MODE_LAYER_SELECT;
                } else if ( this.selectMode ) {
                    mode = MODE_SELECTION;
                }
                zCanvas.interactionPane.setState( enabled, this.activeDocument, mode, this.activeTool );
                if ( enabled ) {
                    const classList = zCanvas.getElement().classList;
                    classList.remove( ...classList );
                    classList.add( pointerStyle );
                } else {
                    this.handleCursor(); // restore cursor to value appropriate to current tool
                }
            }
        }
    },
};
</script>

<style lang="scss">
@import "@/styles/_mixins";
@import "@/styles/component";

.canvas-wrapper {
    display: inline-block;
    width: 100%;
    @include component();

    .content {
        position: relative;
        padding: 0;
        overflow: hidden;
        display: block;

        canvas {
            background: url( "../../assets/images/document_transparent_bg.png" ) repeat;

            &.no-cursor {
                cursor: none;
            }
            &.cursor-drag {
                cursor: grab;
            }
            &.cursor-pointer {
                cursor: pointer;
            }
            &.cursor-crosshair {
                cursor: crosshair;
            }
        }

        &.center canvas {
            @include large() {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            @include mobile() {
                display: block;
                margin: 0 auto;
            }
        }
    }
}
</style>
