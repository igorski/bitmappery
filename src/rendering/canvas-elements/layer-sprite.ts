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
import type { Store } from "vuex";
import type { Point, Rectangle, Size } from "zcanvas";
import type ZoomableCanvas from "./zoomable-canvas";
import ZoomableSprite from "./zoomable-sprite";
import type { Viewport, TransformedDrawBounds } from "zcanvas";
import { createCanvas, canvasToBlob, globalToLocal, getPixelRatio } from "@/utils/canvas-util";
import { renderCross } from "@/utils/render-util";
import { blobToResource } from "@/utils/resource-manager";
import { BlendModes } from "@/definitions/blend-modes";
import { getSizeForBrush } from "@/definitions/brush-types";
import type { Document, Layer, Selection } from "@/definitions/document";
import type { CanvasContextPairing, CanvasDrawable, Brush, BrushToolOptions, BrushAction } from "@/definitions/editor";
import { LayerTypes } from "@/definitions/layer-types";
import ToolTypes, { canDrawOnSelection } from "@/definitions/tool-types";
import { scaleRectangle, rotateRectangle } from "@/math/rectangle-math";
import { translatePointerRotation } from "@/math/point-math";
import { renderEffectsForLayer } from "@/services/render-service";
import { getBlendContext, blendLayer } from "@/rendering/blending";
import { clipContextToSelection } from "@/rendering/clipping";
import { renderClonedStroke } from "@/rendering/cloning";
import { renderBrushStroke } from "@/rendering/drawing";
import { floodFill } from "@/rendering/fill";
import { snapSpriteToGuide } from "@/rendering/snapping";
import { applyTransformation } from "@/rendering/transforming";
import { flushLayerCache, clearCacheProperty } from "@/rendering/cache/bitmap-cache";
import {
    getDrawableCanvas, renderDrawableCanvas, disposeDrawableCanvas, commitDrawingToLayer, sliceBrushPointers, createOverrideConfig
} from "@/rendering/utils/drawable-canvas-utils";
import BrushFactory from "@/factories/brush-factory";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import { enqueueState } from "@/factories/history-state-factory";
import { getLastShape } from "@/utils/selection-util";
import { isShapeClosed } from "@/utils/shape-util";
import type { BitMapperyState } from "@/store";

const HALF   = 0.5;
const TWO_PI = 2 * Math.PI;

let drawBounds; // see draw()

/**
 * A LayerSprite is the renderer for a Documents Layer.
 * It handles all tool interactions with the layer and also provides interaction with the Layers Mask.
 * It inherits from the zCanvas Sprite to be an interactive Canvas drawable.
 */
class LayerSprite extends ZoomableSprite {
    public layer: Layer;
    public actionTarget: "source" | "mask";
    public canvas: ZoomableCanvas; // set through inherited addChild() method
    public cloneStartCoords: Point;
    public toolOptions: any;

    protected _pointerX: number;
    protected _pointerY: number;
    protected _brush: Brush;
    protected _lastBrushIndex: number;
    protected _paintCanvas: CanvasContextPairing; // temporary canvas used during drawing
    protected _isPaintMode: boolean;
    protected _isDragMode: boolean;
    protected _isColorPicker: boolean;
    protected _selection: Selection;
    protected _invertSelection: boolean;
    protected _toolType: ToolTypes;
    protected _orgSourceToStore: string;
    protected _pendingPaintState: number; // ReturnType<typeof setTimeout>;
    protected _rafFx: boolean;

    constructor( layer: Layer ) {
        const { left, top, width, height } = layer;
        super({ x: left, y: top, width, height }); // zCanvas.sprite inheritance

        this.layer = layer; // the Layer this Sprite will be rendering

        if ([ LayerTypes.LAYER_GRAPHIC, LayerTypes.LAYER_TEXT ].includes( layer.type ) && !layer.source ) {
            // create a Canvas on which this layer will render its drawable content.
            const { cvs } = createCanvas( layer.width, layer.height );
            layer.source = cvs;
        }

        this._pointerX = 0;
        this._pointerY = 0;

        // brush properties (used for both drawing on LAYER_GRAPHIC types and to create layer masks)
        this._brush = BrushFactory.create();

        this.setActionTarget();

        if ( layer.source instanceof Image ) {
            const handler = () => {
                this.cacheEffects();
                layer.source.removeEventListener( "load", handler );
            }
            layer.source.addEventListener( "load", handler );
        }
        this.cacheEffects();
    }

    setActionTarget( target: "source" | "mask" = "source" ): void {
        this.actionTarget = target;
    }

    isDrawable(): boolean {
        return this.layer.type === LayerTypes.LAYER_GRAPHIC || this.isMaskable();
    }

    getStore(): Store<BitMapperyState> {
        return this.canvas?.store;
    }

    isMaskable(): boolean {
        return !!this.layer.mask && this.getStore().getters.activeLayerMask === this.layer.mask;
    }

    isRotated(): boolean {
        return ( this.layer.effects.rotation % 360 ) !== 0;
    }

    isScaled(): boolean {
        return this.layer.effects.scale !== 1;
    }

    isDrawing(): boolean {
        return this._isPaintMode && this._brush.down;
    }

    /**
     * Get the actual bounds of the sprite (as transformations like
     * scale and rotation affect the original bounds)
     */
    getActualBounds(): Rectangle {
        if ( !this.isRotated() && !this.isScaled() ) {
            return this._bounds;
        }
        // TODO can we cache this value ?
        return rotateRectangle(
            scaleRectangle( this._bounds, this.layer.effects.scale ),
            this.layer.effects.rotation
        );
    }

    getDragStartOffset(): Point {
        return this._dragStartOffset;
    }

    getDragStartEventCoordinates(): Point {
        return this._dragStartEventCoordinates;
    }

    // forces sychronizing this Sprites positions to the layer position
    // to be called when outside factors have adjusted the Sprite source
    // otherwise use setBounds() for relative positioning with state history

    syncPosition(): void {
        let { left: x, top: y, width, height, effects } = this.layer;
        if ( this.isRotated() ) {
            ({ x, y } = translatePointerRotation( x, y, width / 2, height / 2, effects.rotation ));
        }
        this.setX( x );
        this.setY( y );
    }

    cacheBrush( color: string = "rgba(255,0,0,1)", toolOptions: Partial<BrushToolOptions> = { size: 5, strokes: 1 } ): void {
        this._brush = BrushFactory.create({
            color,
            radius   : toolOptions.size,
            pointers : this._brush.pointers,
            options  : toolOptions
        });
    }

    storeBrushPointer( x: number, y: number ): void {
        this._brush.down = true;
        this._brush.pointers.push({ x, y });
    }

    cacheEffects(): void {
        if ( this._rafFx ) {
            return; // debounced to only occur once before next render cycle
        }
        this._rafFx = true;
        this.canvas?.setLock( true );
        requestAnimationFrame( async () => {
            await renderEffectsForLayer( this.layer );
            this._rafFx = false;
            this.canvas?.setLock( false );
        });
    }

    resetFilterAndRecache(): void {
        clearCacheProperty( this.layer, "filterData" ); // filter must be applied to new contents
        this.cacheEffects(); // sync mask and source changes with sprite Bitmap
    }

    getBitmap(): CanvasDrawable {
        return this._bitmap;
    }

    handleActiveLayer({ id }: Layer ): void {
        this.setInteractive( this.layer.id === id );
    }

    setSelection( document: Document, onlyWhenClosed = false ): void {
        const { activeSelection } = document;
        if ( !onlyWhenClosed || ( isShapeClosed( getLastShape( activeSelection )) && canDrawOnSelection( this.layer ))) {
            this._selection = activeSelection?.length > 0 ? activeSelection : null;
        } else {
            this._selection = undefined;
        }
        this._invertSelection = this._selection && document.invertSelection;
    }

    handleActiveTool( tool: ToolTypes, toolOptions: any, activeDocument: Document ): void {
        if ( tool === this._toolType && toolOptions === this.toolOptions ) {
            return;
        }
        this.isDragging        = false;
        this._isPaintMode      = false;
        this._isDragMode       = false;
        this._isColorPicker    = false;
        this._selection        = undefined;
        this._toolType         = undefined;
        this.toolOptions       = undefined;
        this.cloneStartCoords  = undefined;

        // store pending paint states (if there were any)
        this.storePaintState();

        if ( !this._interactive || !tool ) {
            return;
        }

        this._toolType   = tool;
        this.toolOptions = toolOptions;

        // note we use setDraggable() even outside of ToolTypes.DRAG
        // this is because draggable zCanvas.sprites will trigger the handleMove()
        // handler on pointer events. We override handleMove() for tool specific behaviour.

        switch ( tool ) {
            default:
                this.setDraggable( false );
                break;
            case ToolTypes.DRAG:
                this._isDragMode = true;
                this.setDraggable( true );
                break;
            // drawables
            case ToolTypes.FILL:
            case ToolTypes.ERASER:
            case ToolTypes.BRUSH:
            case ToolTypes.CLONE:
                this.forceMoveListener();
                this.setDraggable( true );
                this._isPaintMode = true;
                this.cacheBrush( this.canvas.store.getters.activeColor, toolOptions );

                // drawable tools can work alongside an existing selection
                this.setSelection( activeDocument, true );
                break;
            case ToolTypes.EYEDROPPER:
                this._isColorPicker = true;
                break;
        }
        this.invalidate();
    }

    // cheap way to hook into zCanvas.handleMove()-handler so we can keep following the cursor in tool modes
    forceMoveListener(): void {
        this.isDragging = true;
        this._dragStartOffset = { x: this.getX(), y: this.getY() };
        this._dragStartEventCoordinates = { x: this._pointerX, y: this._pointerY };
    }

    // draw onto the source Bitmap (e.g. brushing / fill tool / eraser)

    paint( optAction: BrushAction = null ): void {
        if ( !this._pendingPaintState ) {
            this.preparePendingPaintState();
        }
        const isCloneStamp = this._toolType === ToolTypes.CLONE;
        const isFillMode   = this._toolType === ToolTypes.FILL;

        // get the drawing context
        let ctx = this.getPaintSource().getContext( "2d" ) as CanvasRenderingContext2D;
        const { width, height } = ctx.canvas;

        ctx.save(); // 1. preparation save()

        const isDrawing = this.isDrawing();

        // if there is an active selection, painting will be constrained within
        let selection: Selection = optAction?.selection || this._selection;
        if ( selection ) {
            ctx.save(); // 2. clipping save()
            clipContextToSelection( ctx, selection, this.layer.left, this.layer.top, this._invertSelection );
        }

        if ( optAction ) {
            if ( optAction.type === "stroke" ) {
                ctx.strokeStyle = optAction.color;
                ctx.lineWidth   = ( optAction.size ?? 1 ) / this.canvas.documentScale;
                ctx.stroke();
            }
        } else if ( isFillMode ) {
            const color = this.getStore().getters.activeColor;
            if ( this.toolOptions.smartFill ) {
                const point = rotatePointer( this._pointerX, this._pointerY, this.layer, width, height );
                floodFill( ctx, point.x, point.y, color );
            } else {
                ctx.fillStyle = this.getStore().getters.activeColor;
                if ( this._selection ) {
                    ctx.fill();
                } else {
                    ctx.fillRect( 0, 0, width, height );
                }
            }
            if ( this._selection ) {
                ctx.closePath(); // is this necessary ?
            }
        } else if ( isDrawing ) {
            // get the enqueued pointers which are to be rendered in this paint cycle
            const pointers = sliceBrushPointers( this._brush );

            if ( isCloneStamp ) {
                renderClonedStroke( ctx, this._brush, this, this.toolOptions.sourceLayerId,
                    rotatePointers( pointers, this.layer, width, height )
                );
                this.setBitmap( ctx.canvas );
            } else {
                const orgContext = ctx;

                // brush operations are done on a lower resolution canvas during live update
                // where each individual brush stroke is rendered in successive iterations.
                // upon release, the full stroke is rendered on the Layer source (see handleRelease())
                let overrides = null;
                // drawing is handled on a temporary, drawable Canvas
                this._paintCanvas = this._paintCanvas || getDrawableCanvas( this.getPaintSize() );
                overrides = createOverrideConfig( this.canvas, pointers );
                ctx = this._paintCanvas.ctx;

                if ( selection && this._paintCanvas ) {
                    ctx.save(); // 3. drawableCanvas clipping save()
                    // note no offset is required as we are drawing on the full-size _paintCanvas
                    clipContextToSelection( ctx, selection, 0, 0, this._invertSelection, overrides );
                }
                this._lastBrushIndex = renderBrushStroke( ctx, this._brush, overrides, this._lastBrushIndex );

                if ( selection ) {
                    orgContext.restore(); // 3. drawableCanvas clipping restore()
                }
            }
        }
        if ( selection ) {
            ctx.restore(); // 2. clipping restore()
        }
        ctx.restore(); // 1. preparation restore()

        // while user is drawing, defer recache of filters to handleRelease()
        if ( !isDrawing ) {
            this.resetFilterAndRecache();
        }
    }

    /**
     * As storing Bitmaps will consume a lot of memory fast we debounce this by
     * a larger interval to prevent creating a big bitmap per brush stroke.
     * Note that upon switching tools the state is enqueued immediately to
     * not delay to history state UI from updating more than necessary.
     */
    preparePendingPaintState(): void {
        canvasToBlob( this.getPaintSource() ).then( blob => {
            this._orgSourceToStore = blobToResource( blob );
        });
        this.debouncePaintStore();
    }

    debouncePaintStore( timeout: number = 5000 ): void {
        this._pendingPaintState = window.setTimeout( this.storePaintState.bind( this ), timeout );
    }

    getPaintSource(): HTMLCanvasElement {
        return this.isMaskable() ? this.layer.mask : this.layer.source;
    }

    getPaintSize(): Size {
        const source = this.getPaintSource();
        return { width: source.width, height: source.height };
        /*
        // depending on zoom level, the interpolation when committing the drawableCanvas content onto the source
        // may benefit from a higher resolution when drawing on a zoomed in canvas. But maybe negligible and not worth memory overhead
        const { documentScale } = this.canvas;
        return constrain(
            fastRound( source.width  * documentScale ),
            fastRound( source.height * documentScale ),
            MAX_MEGAPIXEL
        );*/
    };

    async storePaintState(): Promise<boolean> {
        if ( !this._pendingPaintState ) {
            return true;
        }
        window.clearTimeout( this._pendingPaintState );
        if ( this.isDrawing() ) {
            // still painting, debounce again (layer.source only updated on handleRelease())
            this.debouncePaintStore( 1000 );
            return false;
        }
        this._pendingPaintState = null;
        const layer    = this.layer;
        const orgState = this._orgSourceToStore;

        this._orgSourceToStore = null;

        const isMask = this.isMaskable();
        const blob   = await canvasToBlob( this.getPaintSource() );
        const newState = blobToResource( blob );
        enqueueState( `spritePaint_${layer.id}`, {
            undo(): void {
                restorePaintFromHistory( layer, orgState, isMask );
            },
            redo(): void {
                restorePaintFromHistory( layer, newState, isMask );
            },
            resources: [ orgState, newState ],
        });
        return true;
    }

    /* the following override zCanvas.sprite */

    setBounds( x: number, y: number, width = 0, height = 0 ): void {
        const bounds = this._bounds;
        const layer  = this.layer;

        // store current values (for undo)
        const { left, top } = bounds;
        const oldLayerX = layer.left;
        const oldLayerY = layer.top;

        if ( width === 0 || height === 0 ) {
            ({ width, height } = bounds );
        }

        // commit change
        super.setBounds( x, y, width, height );

        // store new value (for redo)
        const newX = bounds.left;
        const newY = bounds.top;

        // update the Layer model by the relative offset
        // (because the Sprite maintains an alternate position when the Layer is rotated)

        const newLayerX = layer.left + ( newX - left );
        const newLayerY = layer.top  + ( newY - top );

        layer.left = newLayerX;
        layer.top  = newLayerY;

        enqueueState( `spritePos_${layer.id}`, {
            undo() {
                positionSpriteFromHistory( layer, left, top );
                layer.left = oldLayerX;
                layer.top  = oldLayerY;
            },
            redo() {
                positionSpriteFromHistory( layer, newX, newY );
                layer.left = newLayerX;
                layer.top  = newLayerY;
            }
        });
        this.invalidate();
    }

    /**
     * override that takes rotation into account
     * @todo: when migrating to zCanvas 6+ this is handled by zCanvas.sprite#insideBounds
     */
    insideBounds( x: number, y: number ): boolean {
        const { left, top, width, height } = this.getActualBounds();
        return x >= left && x <= ( left + width ) &&
               y >= top  && y <= ( top  + height );
    }

    handlePress( x: number, y: number, { type }: Event ): void {
        if ( type.startsWith( "touch" )) {
            this._pointerX = x;
            this._pointerY = y;
        }
        if ( this._isColorPicker ) {
            // color picker mode, get the color below the clicked point
            const local = globalToLocal( this.canvas, x, y );
            const p = ( this.canvas.getElement().getContext( "2d" ) as CanvasRenderingContext2D ).getImageData(
                local.x - this.canvas.getViewport().left,
                local.y - this.canvas.getViewport().top,
                1, 1
            ).data;
            this.getStore().commit( "setActiveColor", `rgba(${p[0]},${p[1]},${p[2]},${(p[3]/255)})` );
        }
        else if ( this._isPaintMode ) {
            if ( this._toolType === ToolTypes.CLONE ) {
                // pressing down when using the clone tool with no coords defined in the toolOptions,
                // sets the source coords (within the source Layer)
                if ( !this.toolOptions.coords ) {
                    this.toolOptions.coords = { x, y };
                    this.cloneStartCoords = undefined;
                    return;
                } else if ( !this.cloneStartCoords ) {
                    // pressing down again indicates the cloning paint operation starts (in handleMove())
                    // set the start coordinates (of this target Layer) relative to the source Layers coords
                    this.cloneStartCoords = { x, y };
                }
            } else if ( this._toolType === ToolTypes.FILL ) {
                this.paint();
                return;
            }
            // for any other brush mode state, set the brush application to true (will be applied in handleMove())
            this.storeBrushPointer( x, y );
            this._lastBrushIndex = 1;
        } else if ( this._isDragMode ) {
            this.canvas.draggingSprite = this;
        }
    }

    handleMove( x: number, y: number, event: Event ): void {
        // store reference to current pointer position (relative to canvas)
        // note that for touch events this is handled in handlePress() instead
        if ( !event.type.startsWith( "touch" )) {
            this._pointerX = x;
            this._pointerY = y;
        }

        if ( !this._isPaintMode ) {
            // not drawable, perform default behaviour (drag)
            if ( this.actionTarget === "mask" ) {
                const layer = this.layer;
                const { maskX, maskY } = layer;
                const newMaskX = this._dragStartOffset.x + (( x - this._bounds.left ) - this._dragStartEventCoordinates.x );
                const newMaskY = this._dragStartOffset.y + (( y - this._bounds.top )  - this._dragStartEventCoordinates.y );
                const commit = () => {
                    layer.maskX = newMaskX;
                    layer.maskY = newMaskY;
                    getSpriteForLayer( layer )?.resetFilterAndRecache();
                };
                commit();
                enqueueState( `maskPos_${layer.id}`, {
                    undo() {
                        layer.maskX = maskX;
                        layer.maskY = maskY;
                        getSpriteForLayer( layer )?.resetFilterAndRecache();
                    },
                    redo: commit
                });
            } else if ( this._isDragMode ) {
                super.handleMove( x, y, event );
                return;
            }
        }

        // brush mode and brushing is active
        if ( this.isDrawing() ) {
            // enqueue current pointer position, painting of all enqueued pointers will be deferred
            // to the update()-hook, this prevents multiple renders on each move event
            this.storeBrushPointer( x, y );
        }
    }

    handleRelease( _x: number, _y: number ): void {
        const { getters } = this.getStore();

        if ( this.isDrawing() ) {
            commitDrawingToLayer(
                this.layer, this.getPaintSource(), this.getPaintSize(), this.canvas, this._brush.options.opacity,
                this._toolType === ToolTypes.ERASER ? "destination-out" : undefined
            );
            disposeDrawableCanvas();
            this.resetFilterAndRecache();
            
            this._paintCanvas  = null;
            this._brush.down = false;
            this._brush.last = 0;
            this._brush.pointers.length = 0;

            // immediately store pending history state when not running in lowMemory mode
            if ( !getters.getPreference( "lowMemory" )) {
                this.storePaintState();
            }
        }
        if ( this._isPaintMode ) {
            this.forceMoveListener(); // keeps the move listener active
        }
        else if ( this._isDragMode ) {
            // check whether we need to snap to a guide
            if ( getters.snapAlign ) {
                snapSpriteToGuide( this, this.canvas.guides );
            }
            this.canvas.draggingSprite = null;
        }
    }

    update(): void {
        if ( this.isDrawing() ) {
            this.paint();
            this._brush.last = this._brush.pointers.length;
        }
    }

    drawCropped( canvasContext: CanvasRenderingContext2D, transformedBounds: TransformedDrawBounds ): void {
        if ( !this.isScaled() ) {
            return super.drawCropped( canvasContext, transformedBounds );
        }
        const scale = 1 / this.layer.effects.scale;
        const { src, dest } = transformedBounds;
        canvasContext.drawImage(
            this._bitmap,
            ( HALF + src.left * scale )    << 0,
            ( HALF + src.top * scale )     << 0,
            ( HALF + src.width * scale )   << 0,
            ( HALF + src.height * scale )  << 0,
            ( HALF + dest.left )   << 0,
            ( HALF + dest.top )    << 0,
            ( HALF + dest.width )  << 0,
            ( HALF + dest.height ) << 0
        );
    }

    // @ts-expect-error incompatible override
    draw( documentContext: CanvasRenderingContext2D, viewport: Viewport, isHighresExport = false ): void {
        drawBounds = this._bounds;

        const { enabled, blendMode, opacity } = this.layer.filters;
        const altOpacity = enabled && opacity !== 1;
        if ( altOpacity ) {
            documentContext.globalAlpha = opacity;
        }

        let drawContext: CanvasRenderingContext2D = documentContext;
        const applyBlending = enabled && blendMode !== BlendModes.NORMAL;

        if ( applyBlending ) {
            drawContext = getBlendContext( documentContext.canvas );
            const scaleFactor = isHighresExport ? getPixelRatio() : getPixelRatio() * this.canvas.zoomFactor;
            drawContext.scale( scaleFactor, scaleFactor );
        }

        drawContext.save(); // 1. transformation save()

        const transformedBounds = applyTransformation( drawContext, this.layer, viewport );
        const transformCanvas   = !!transformedBounds;

        if ( transformCanvas ) {
            drawBounds = transformedBounds;
        }

        // invoke base class behaviour to render bitmap
        super.draw( drawContext, transformCanvas ? undefined : viewport, drawBounds );

        if ( applyBlending ) {
            blendLayer( documentContext, drawContext, blendMode );
        }

        drawContext.restore(); // 1. transformation restore()

        // user is currently drawing on this layer, render contents of drawableCanvas onto screen
        // @todo replace this._paintCanvas check with isDrawing() once there is no conditional behaviour inside paint()
        if ( this._paintCanvas ) {
            renderDrawableCanvas(
                documentContext, this.getPaintSize(), this.canvas, this._brush.options.opacity,
                this._toolType === ToolTypes.ERASER || this.isMaskable() ? "destination-out" : undefined,
            );
        }

        if ( altOpacity ) {
            documentContext.globalAlpha = 1; // restore document opacity
        }

        // render brush outline at pointer position

        if ( !isHighresExport && this._isPaintMode ) {
            const { zoomFactor } = this.canvas;
            const tx = this._pointerX - viewport.left;
            const ty = this._pointerY - viewport.top;

            documentContext.lineWidth = 2 / zoomFactor;
            const drawBrushOutline = this._toolType !== ToolTypes.CLONE || !!this.toolOptions.coords;
            if ( this._toolType === ToolTypes.CLONE ) {
                const { coords } = this.toolOptions;
                const relSource = this.cloneStartCoords ?? this._dragStartEventCoordinates;
                const cx = coords ? ( coords.x - viewport.left ) + ( this._pointerX - relSource.x ) : tx;
                const cy = coords ? ( coords.y - viewport.top  ) + ( this._pointerY - relSource.y ) : ty;
                // when no source coordinate is set, or when applying the clone stamp, we show a cross to mark the origin
                if ( !coords || this.isDrawing() ) {
                    renderCross( documentContext, cx, cy, this._brush.radius / zoomFactor );
                }
            }
            documentContext.save(); // 4. brush outline save()
            documentContext.beginPath();

            if ( drawBrushOutline ) {
                // any other brush mode state shows brush outline
                documentContext.arc( tx, ty, getSizeForBrush( this._brush ), 0, TWO_PI );
                documentContext.strokeStyle = "#999";
            }
            documentContext.stroke();
            documentContext.restore(); // 4. brush outline restore()
        }
    }

    dispose(): void {
        super.dispose();

        flushLayerCache( this.layer );

        this._bitmap      = null;
        this._bitmapReady = false;
    }
}
export default LayerSprite;

/* internal non-instance methods */

function rotatePointers( pointers: Point[], layer: Layer, sourceWidth: number, sourceHeight: number ): Point[] {
    // we take layer.left instead of bounds.left as it provides the unrotated Layer offset
    const { left, top } = layer;
    // translate pointer to translated space, when layer is rotated or mirrored
    const { mirrorX, mirrorY, rotation } = layer.effects;
    return pointers.map( point => {
        // translate recorded pointer towards rotated point
        // and against layer position
        const p = translatePointerRotation(
            point.x - left,
            point.y - top,
            sourceWidth  * HALF,
            sourceHeight * HALF,
            mirrorY ? -rotation : rotation
        );
        if ( mirrorX ) {
            p.x -= sourceWidth;
        }
        if ( mirrorY ) {
            p.y -= sourceHeight;
        }
        return p;
    });
}

function rotatePointer( x: number, y: number, layer: Layer, sourceWidth: number, sourceHeight: number ): Point {
    return rotatePointers([{ x, y }], layer, sourceWidth, sourceHeight )[ 0 ];
}

// NOTE we use getSpriteForLayer() instead of passing the Sprite by reference
// as it is possible the Sprite originally rendering the Layer has been disposed
// and a new one has been created while traversing the change history

function positionSpriteFromHistory( layer: Layer, x: number, y: number ): void {
    const sprite = getSpriteForLayer( layer );
    if ( sprite ) {
        sprite.getBounds().left = x;
        sprite.getBounds().top  = y;
        sprite.invalidate();
    }
}

function restorePaintFromHistory( layer: Layer, state: string, isMask: boolean ): void {
    const source = isMask ? layer.mask : layer.source;
    const ctx = source.getContext( "2d" ) as CanvasRenderingContext2D;
    ctx.clearRect( 0, 0, source.width, source.height );
    const image  = new Image();
    image.onload = () => {
        ctx.drawImage( image, 0, 0 );
        getSpriteForLayer( layer )?.resetFilterAndRecache();
    };
    image.src = state;
}
