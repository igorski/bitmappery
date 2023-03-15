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
    <div
        class="canvas-wrapper"
        :class="{ 'has-content': activeDocument }"
        :style="{ 'height': wrapperHeight }"
        @mousedown="handleOutsideDown( $event )"
        @mousemove="handleOutsideMove( $event )"
        @mouseup="handleOutsideUp( $event )"
        @pointerleave="handleOutsideUp( $event )"
        @touchstart="handleOutsideDown( $event )"
        @touchmove="handleOutsideMove( $event )"
        @touchend="handleOutsideUp( $event )"
        @touchcancel="handleOutsideUp( $event )"
    >
        <template v-if="activeDocument">
            <div class="component__header">
                <h2 class="component__title">{{ documentTitle }}</h2>
            </div>
            <button
                type="button"
                class="component__header-button"
                @click="requestDocumentClose()"
            >&#215;</button>
            <div
                ref="canvasContainer"
                class="component__content"
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
import ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";
import GuideRenderer from "@/rendering/canvas-elements/guide-renderer";
import FileImport from "@/components/file-import/file-import.vue";
import { HEADER_HEIGHT } from "@/definitions/editor-properties";
import ToolTypes, { SELECTION_TOOLS, MAX_ZOOM, calculateMaxScaling, usesInteractionPane } from "@/definitions/tool-types";
import { MODE_PAN, MODE_LAYER_SELECT, MODE_SELECTION } from "@/rendering/canvas-elements/interaction-pane";
import Scrollbars from "./scrollbars/scrollbars.vue";
import TouchDecorator from "./decorators/touch-decorator";
import { scaleToRatio } from "@/math/image-math";
import { pointerToCanvasCoordinates } from "@/math/point-math";
import { scale } from "@/math/unit-math";
import { unblockedWait, rafCallback } from "@/utils/debounce-util";
import { getAlignableObjects } from "@/utils/document-util";
import { isMobile } from "@/utils/environment-util";
import { fitInWindow } from "@/utils/zoom-util";
import {
    getCanvasInstance, setCanvasInstance,
    createSpriteForLayer, getSpriteForLayer, flushLayerSprites, flushCache as flushSpriteCache,
} from "@/factories/sprite-factory";
import { flushCache as flushBitmapCache } from "@/rendering/cache/bitmap-cache";
import { renderState } from "@/services/render-service";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";

/* internal non-reactive properties */

const mobileView = isMobile();
let lastDocument, containerSize, canvasBoundingBox, guideRenderer;
// maintain a pool of sprites representing the layers within the active document
// the sprites themselves are cached within the sprite-factory, this is merely
// used for change detection in the current editing session (see watchers)
const layerPool = new Map();
// scale of the on-screen canvas relative to the document
// eslint-disable-next-line no-unused-vars
let xScale = 1, yScale = 1, zoom = 1, maxInScale = 1, maxOutScale = 1;

function calculateCanvasBoundingBox() {
    const zCanvas = getCanvasInstance();
    if ( zCanvas ) {
        zCanvas._bounds = null; // TODO : can be removed after update to zCanvas 5.1.5 (requires Webpack 5 migration)
        canvasBoundingBox = getCanvasInstance()?.getCoordinate();
    }
}

export default {
    components: {
        Scrollbars,
        FileImport,
    },
    mixins: [ TouchDecorator ],
    data: () => ({
        wrapperHeight: "100%",
        centerCanvas: false,
        cvsWidth: 100,
        cvsHeight: 100,
        viewportWidth: 100,
        viewportHeight: 100,
        // whether a pointer down event was started outside of the canvas area
        hasOutsideAction: false,
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
            "activeToolOptions",
            "antiAlias",
            "canvasDimensions",
            "snapAlign",
            "pixelGrid",
            "zoomOptions",
        ]),
        documentTitle() {
            const { name } = this.activeDocument;
            if ( name.includes( "." )) {
                return name; // is local image
            }
            return `${name}.${PROJECT_FILE_EXTENSION}`;
        },
        hasGuideRenderer() {
            return this.snapAlign || this.pixelGrid;
        },
    },
    watch: {
        windowSize() {
            this.calcIdealDimensions();
        },
        activeDocument: {
            handler( document ) {
                // no active document or no document content
                if ( !document?.layers ) {
                    if ( getCanvasInstance() ) {
                        this.removeTouchListeners();
                        getCanvasInstance().dispose();
                        setCanvasInstance( null );
                    }
                    return;
                }
                if ( !getCanvasInstance() ) {
                    const zCanvas = this.createCanvas();
                    this.$nextTick(() => {
                        zCanvas.insertInPage( this.$refs.canvasContainer );
                        this.addTouchListeners( this.$refs.canvasContainer );
                        this.calcIdealDimensions( true );
                    });
                }
                const { id } = document;
                // switching between documents
                if ( id !== lastDocument ) {
                    lastDocument = id;
                    flushSpriteCache();
                    flushBitmapCache();
                    renderState.reset();
                    layerPool.clear();
                    this.calcIdealDimensions( true );
                    this.$nextTick( async () => {
                        // previously active tool needs to update to new document ref
                        const tool = this.activeTool;
                        if ( tool === null ) {
                            this.updateInteractionPane();
                            return;
                        }
                        // fugly: to force a change we need to first unset the active tool
                        this.setActiveTool({ tool: null });
                        await this.$nextTick();
                        this.setActiveTool({ tool, document });
                    });
                }
            }
        },
        layers: {
            handler() {
                this.createLayerRenderers();
            },
        },
        activeLayer( layer ) {
            if ( !layer ) {
                return;
            }
            [ ...layerPool.entries() ].forEach(([ , sprite ]) => {
                sprite.handleActiveLayer( layer );
                sprite.handleActiveTool( this.activeTool, this.activeToolOptions, this.activeDocument );
            });
            this.handleGuides();
        },
        activeTool( tool ) {
            if ( usesInteractionPane( tool )) {
                this.setPanMode( tool === ToolTypes.MOVE );
                this.setSelectMode( SELECTION_TOOLS.includes( tool ));
                this.updateInteractionPane();
            } else {
                this.handleCursor();
                getCanvasInstance()?.interactionPane?.handleActiveTool( tool, false );
            }
            this.handleGuides();
        },
        zoomOptions: {
            deep: true,
            handler({ level }) {
                // are we zooming in or out (relative from the base, not necessarily the previous value)
                if ( level > 0 ) {
                    zoom = scale( level, MAX_ZOOM, maxInScale - 1 ) + 1;
                } else {
                    zoom = 1 - scale( Math.abs( level ), MAX_ZOOM, 1 - ( 1 / maxOutScale ));
                }
                // rescale canvas, note we omit the best fit calculation as we zoom from the calculated base
                this.scaleCanvas( false );
                rafCallback( calculateCanvasBoundingBox );
            }
        },
        panMode() {
            this.updateInteractionPane( "cursor-drag" );
        },
        layerSelectMode() {
            this.updateInteractionPane();
        },
        selectMode() {
            this.updateInteractionPane();
        },
        hasGuideRenderer( value ) {
            getCanvasInstance()?.[ value ? "addChild" : "removeChild" ]( guideRenderer );
        },
        snapAlign() {
            this.updateGuideModes();
            this.handleGuides();
        },
        pixelGrid() {
            this.updateGuideModes();
        },
        antiAlias( value ) {
            getCanvasInstance()?.setSmoothing( value );
        },
    },
    async mounted() {
        this.detectTouch();
        await this.$nextTick();
        this.cacheContainerSize();
        this.scaleWrapper();
    },
    methods: {
        ...mapMutations([
            "setCanvasDimensions",
            "setActiveTool",
            "setPanMode",
            "setSelectMode",
            "setToolOptionValue",
        ]),
        ...mapActions([
            "requestDocumentClose",
        ]),
        createCanvas() {
            // note dimensions will be adjusted by scaleCanvas()
            const zCanvas = new ZoomableCanvas(
                {
                    width: this.cvsWidth,
                    height: this.cvsHeight,
                    animate: false,
                    smoothing: this.antiAlias,
                    stretchToFit: false,
                    viewport: {
                        width  : this.viewportWidth,
                        height : this.viewportHeight
                    },
                    handler: this.handleCanvasEvent.bind( this ),
                },
                this.$store,
                this.calcIdealDimensions.bind( this, true ),
                this.refreshRenderers.bind( this ),
            );
            setCanvasInstance( zCanvas );
            guideRenderer = new GuideRenderer( this.hasGuideRenderer ? zCanvas : null );
            this.updateGuideModes();
            return zCanvas;
        },
        cacheContainerSize() {
            containerSize = this.$el.parentNode?.getBoundingClientRect();
            containerSize.height -= HEADER_HEIGHT;

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
                const maxScaling = calculateMaxScaling( scaledSize.width, scaledSize.height, width, height, containerSize.width, containerSize.height );

                ({ maxInScale, maxOutScale }  = maxScaling );

                this.setCanvasDimensions({
                    ...scaledSize,
                    ...maxScaling,
                    visibleWidth  : containerSize.width,
                    visibleHeight : containerSize.height,
                });
                xScale = scaledSize.width  / this.activeDocument.width;
                yScale = scaledSize.height / this.activeDocument.height;

                this.viewportWidth  = containerSize.width;
                this.viewportHeight = containerSize.height;
                zCanvas.setViewport( this.viewportWidth, this.viewportHeight );
                calculateCanvasBoundingBox();
            }
            this.scaleWrapper();
            // replace below with updated zCanvas lib to not multiply by zoom
            this.cvsWidth  = this.canvasDimensions.width  * zoom;
            this.cvsHeight = this.canvasDimensions.height * zoom;
            zCanvas.setDocumentScale( this.cvsWidth, this.cvsHeight, xScale, zoom, this.activeDocument );
            this.centerCanvas = zCanvas.getWidth() < containerSize.width || zCanvas.getHeight() < containerSize.height ;
        },
        scaleWrapper() {
            if ( !mobileView ) {
                this.wrapperHeight = `${window.innerHeight - containerSize.top - 20}px`;
            }
        },
        calcIdealDimensions( scaleDocumentToFit = false ) {
            this.cacheContainerSize();
            this.scaleCanvas();
            if ( scaleDocumentToFit && this.activeDocument ) {
                // set zoom to optimum scale
                this.setToolOptionValue({ tool: ToolTypes.ZOOM, option: "level", value: fitInWindow( this.activeDocument, this.canvasDimensions ) });
            }
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
        updateGuideModes() {
            guideRenderer?.setModes( this.snapAlign, this.pixelGrid );
        },
        handleGuides() {
            if ( !this.snapAlign ) {
                return;
            }
            let alignableObjects = null;
            if ( this.activeTool === ToolTypes.DRAG ) {
                alignableObjects = getAlignableObjects( this.activeDocument, this.activeLayer );
            }
            getCanvasInstance()?.setGuides( alignableObjects );
        },
        updateInteractionPane( pointerStyle = "cursor-pointer" ) {
            const zCanvas = getCanvasInstance();
            if ( zCanvas ) {
                const enabled = true; // always enabled (shows active layer outline)//this.panMode || this.layerSelectMode || this.selectMode;
                let mode;
                if ( this.panMode ) {
                    mode = MODE_PAN;
                } else if ( this.layerSelectMode ) {
                    mode = MODE_LAYER_SELECT;
                } else if ( this.selectMode ) {
                    mode = MODE_SELECTION;
                }
                zCanvas.interactionPane.setState( enabled, mode, this.activeTool, this.activeToolOptions );
                if ( enabled ) {
                    const classList = zCanvas.getElement().classList;
                    classList.remove( ...classList );
                    classList.add( pointerStyle );
                } else {
                    this.handleCursor(); // restore cursor to value appropriate to current tool
                }
            }
        },
        /**
         * Lazily create all renderers (layer sprites) for each layer. Renderers are pooled
         * so subsequent calls (for instance on addition / removal of individual layers)
         * only affect the appropriate layers.
         */
        createLayerRenderers() {
            const seen    = [];
            const zCanvas = getCanvasInstance();
            this.layers?.forEach( layer => {
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
            this.layers?.filter(({ visible }) => visible ).forEach( layer => {
                const sprite = getSpriteForLayer( layer );
                zCanvas.removeChild( sprite );
                zCanvas.addChild( sprite );
            });
            zCanvas?.interactionPane.stayOnTop();
            this.hasGuideRenderer && guideRenderer.stayOnTop();
        },
        /**
         * A hard "reset" of all layer sprites. This is only necessary when layer
         * source content has changed (e.g. document resize), forcing all sprites
         * to re-render their cached contents.
         */
        async refreshRenderers() {
            flushSpriteCache();
            flushBitmapCache();
            renderState.reset();
            layerPool.clear();
            await unblockedWait();
            this.createLayerRenderers();
        },
        handleOutsideDown( event ) {
            if ( event.target.tagName === "CANVAS" || !getCanvasInstance() ) {
                return; // don't handle clicks originating from the canvas
            }
            const zCanvas = getCanvasInstance();
            const { x, y } = pointerToCanvasCoordinates( event.pageX, event.pageY, zCanvas, canvasBoundingBox );

            if ( [ ToolTypes.BRUSH, ToolTypes.ERASER ].includes( this.activeTool )) {
                getSpriteForLayer( this.activeLayer )?.handlePress( x, y, event );
            } else if ( this.selectMode ) {
                zCanvas.interactionPane.startOutsideSelection( x, y );
            } else {
                return; // unhandled action
            }
            this.hasOutsideAction = true;
        },
        handleOutsideMove( event ) {
            if ( event.target.tagName === "CANVAS" || !getCanvasInstance() ) {
                return;
            }
            // TODO only when supported outside tools/modes are active ?
            getCanvasInstance().handleInteraction( event );
        },
        handleOutsideUp( event ) {
            if ( !this.hasOutsideAction ) {
                return;
            }
            this.hasOutsideAction = false;
            const zCanvas = getCanvasInstance();
            const { x, y } = pointerToCanvasCoordinates( event.pageX, event.pageY, zCanvas, canvasBoundingBox );

            if ( [ ToolTypes.BRUSH, ToolTypes.ERASER ].includes( this.activeTool )) {
                getSpriteForLayer( this.activeLayer )?.handleRelease( x, y, event );
            } else if ( this.selectMode ) {
                getCanvasInstance()?.interactionPane.stopOutsideSelection();
            }
        },
    },
};
</script>

<style lang="scss">
@import "@/styles/_mixins";
@import "@/styles/component";
@import "@/styles/ui";

.canvas-wrapper {
    display: inline-block;
    width: 100%;
    @include component();

    &.has-content {
        background-color: $color-bg-light;
    }

    .component__header-button {
        @include closeButton();
    }

    .component__content {
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
