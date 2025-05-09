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
import { BlendModes } from "@/definitions/blend-modes";
import type { Document, Layer, Selection } from "@/definitions/document";
import type { CanvasContextPairing, CanvasDrawable, Brush, BrushToolOptions, BrushAction } from "@/definitions/editor";
import { LayerTypes } from "@/definitions/layer-types";
import ToolTypes, { canDragMask, TOOL_SRC_MERGED } from "@/definitions/tool-types";
import BrushFactory from "@/factories/brush-factory";
import { scaleRectangle, rotateRectangle } from "@/math/rectangle-math";
import { translatePointerRotation, rotatePointer } from "@/math/point-math";
import { fastRound } from "@/math/unit-math";
import { getBlendContext, blendLayer } from "@/rendering/operations/blending";
import { clipContextToSelection, clipLayer } from "@/rendering/operations/clipping";
import { renderClonedStroke, setCloneSource } from "@/rendering/operations/cloning";
import { renderBrushStroke } from "@/rendering/operations/drawing";
import { floodFill } from "@/rendering/operations/fill";
import { getMaskComposite, disposeMaskComposite, maskImage } from "@/rendering/operations/masking";
import { snapToGuide } from "@/rendering/operations/snapping";
import { applyTransformation } from "@/rendering/operations/transforming";
import { flushLayerCache, clearCacheProperty } from "@/rendering/cache/bitmap-cache";
import { cacheBlendedLayer, flushBlendedLayerCache, getBlendCache, getBlendableLayers, isBlendCached, pauseBlendCaching, useBlendCaching } from "@/rendering/cache/blended-layer-cache";
import { renderBrushOutline } from "@/rendering/cursors/brush";
import {
    getDrawableCanvas, renderDrawableCanvas, disposeDrawableCanvas, sliceBrushPointers, createOverrideConfig
} from "@/rendering/utils/drawable-canvas-utils";
import { renderEffectsForLayer } from "@/services/render-service";
import { replaceLayerSource } from "@/store/actions/layer-source-replace";
import { positionLayer } from "@/store/actions/layer-position";
import { positionMask } from "@/store/actions/mask-position";
import { createCanvas, canvasToBlob, cloneCanvas, globalToLocal, getPixelRatio } from "@/utils/canvas-util";
import { createSyncSnapshot } from "@/utils/document-util";
import { hasBlend, isDrawable, isMaskable, isRotated, isScaled } from "@/utils/layer-util";
import { blobToResource } from "@/utils/resource-manager";
import { getLastShape } from "@/utils/selection-util";
import { isShapeClosed } from "@/utils/shape-util";
import type { BitMapperyState } from "@/store";

const HALF = 0.5;
let drawBounds: Rectangle; // see draw()

/**
 * A LayerRenderer is the renderer for a Documents Layer.
 * It handles all tool interactions with the layer and also provides interaction with the Layers Mask.
 * It inherits from the zCanvas Sprite to be an interactive Canvas drawable.
 */
export default class LayerRenderer extends ZoomableSprite {
    public layer: Layer;
    public layerIndex: number;
    public actionTarget: "source" | "mask";
    public cloneStartCoords: Point | undefined;
    public toolOptions: any;
    public canvas: ZoomableCanvas;

    protected _pointer: Point;
    protected _brush: Brush;
    protected _lastBrushIndex: number;
    protected _paintCanvas: CanvasContextPairing; // temporary canvas used during drawing
    protected _isPaintMode: boolean;
    protected _isDragMode: boolean;
    protected _isColorPicker: boolean;
    protected _selection: Selection;
    protected _invertSelection: boolean;
    protected _toolType: ToolTypes;
    protected _orgSourceToStore: HTMLCanvasElement | undefined;
    protected _pendingPaintState: number | undefined; // ReturnType<typeof setTimeout>;
    protected _pendingEffectsRender: boolean;
    protected _unmaskedBitmap: HTMLCanvasElement | undefined; // a reference to the effected source w/out mask applied
    protected _draggingMask: Point | undefined;

    constructor( layer: Layer ) {
        const { left, top, width, height } = layer;
        super({ x: left, y: top, width, height }); // zCanvas.sprite inheritance

        this.layer = layer; // the Layer this renderer will be rendering

        if ([ LayerTypes.LAYER_GRAPHIC, LayerTypes.LAYER_TEXT ].includes( layer.type ) && !layer.source ) {
            // create a Canvas on which this layer will render its drawable content.
            const { cvs } = createCanvas( layer.width, layer.height );
            layer.source = cvs;
        }

        this._pointer     = { x: 0, y: 0 };
        this.layerIndex   = 0; // managed by document-canvas
        this._isPaintMode = false;

        // brush properties (used for both drawing on LAYER_GRAPHIC types and to create layer masks)
        this._brush = BrushFactory.create();

        this.setActionTarget();
        this.cacheEffects();
    }

    setActionTarget( target: "source" | "mask" = "source" ): void {
        this.actionTarget = target;
    }

    setUnmaskedBitmap( unmaskedBitmap?: HTMLCanvasElement ): void {
        this._unmaskedBitmap = unmaskedBitmap; // this bitmap will only be defined when the layer has a mask
    }

    getStore(): Store<BitMapperyState> {
        return this.canvas?.store;
    }

    isDrawing(): boolean {
        return this._isPaintMode && this._brush.down;
    }

    /**
     * Get the actual bounds of the renderer (as transformations like
     * scale and rotation affect the original bounds)
     */
    getActualBounds(): Rectangle {
        if ( !isRotated( this.layer ) && !isScaled( this.layer ) ) {
            return this._bounds;
        }
        // TODO can we cache this value ?
        return rotateRectangle(
            scaleRectangle( this._bounds, this.layer.transform.scale ),
            this.layer.transform.rotation
        );
    }

    getDragStartOffset(): Point {
        return this._dragStartOffset;
    }

    getDragStartEventCoordinates(): Point {
        return this._dragStartEventCoordinates;
    }

    // forces sychronizing this renderers positions to the layer position
    // to be called when outside factors have adjusted the renderer source
    // otherwise use setBounds() for relative positioning with state history

    syncPosition(): void {
        let { left: x, top: y, width, height, transform } = this.layer;
        if ( isRotated( this.layer ) ) {
            ({ x, y } = translatePointerRotation( x, y, width / 2, height / 2, transform.rotation ));
        }
        this.setX( x );
        this.setY( y );
    }

    cacheBrush( color: string = "rgba(255,0,0,1)", toolOptions: Partial<BrushToolOptions> = { size: 5, strokes: 1 } ): void {
        if ( !isDrawable( this.layer, this.getStore() )) {
            return;
        }
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
        if ( this._pendingEffectsRender ) {
            return; // debounced to only occur once before next render cycle
        }
        this._pendingEffectsRender = true;
        this.canvas?.setLock( true );
        requestAnimationFrame( async () => {
            await renderEffectsForLayer( this.layer );
            this._pendingEffectsRender = false;
            this.canvas?.setLock( false );
            this.invalidateBlendCache( true ); // now layer effects are cached, invalidate any existing blend cache
        });
    }

    resetFilterAndRecache(): void {
        clearCacheProperty( this.layer, "filterData" ); // filter must be applied to new contents
        this.cacheEffects(); // sync mask and source changes with the renderers Bitmap
    }

    invalidateBlendCache( full = false ): void {
        if ( hasBlend( this.layer ) || isBlendCached( this.layerIndex )) {
            flushBlendedLayerCache( full );
        }
    }

    getBitmap(): CanvasDrawable {
        return this._bitmap;
    }

    handleActiveLayer({ id }: Layer ): void {
        this.setInteractive( this.layer.id === id );
    }

    setSelection( document: Document, onlyWhenClosed = false ): void {
        const { activeSelection } = document;
        if ( !onlyWhenClosed || ( isShapeClosed( getLastShape( activeSelection )))) {
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
                this.cacheBrush( this.getStore().getters.activeColor, toolOptions );

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
        this._dragStartEventCoordinates = { ...this._pointer };
    }

    // draw onto the source Bitmap (e.g. brushing / fill tool / eraser)

    paint( optAction: BrushAction = null ): void {
        if ( !this._pendingPaintState ) {
            this.preparePendingPaintState();
        }
        const isCloneStamp = this._toolType === ToolTypes.CLONE;
        const isFillMode   = this._toolType === ToolTypes.FILL;
        const isDrawing    = this.isDrawing();
        
        // get the drawing context
        let ctx = this.getPaintSource().getContext( "2d" ) as CanvasRenderingContext2D;
        const { width, height } = ctx.canvas;

        // if there is an active selection, painting will be constrained within
        let selection: Selection = optAction?.selection || this._selection;

        // get the enqueued pointers which are to be rendered in this paint cycle
        const pointers  = isDrawing ? sliceBrushPointers( this._brush ) : undefined;
        const overrides = createOverrideConfig( this.canvas, pointers );
        
        // most drawing operations operate directly onto a temporary Canvas
        const usePaintCanvas = this.usePaintCanvas() || ( optAction?.type === "stroke" );
        const doSaveRestore  = !!selection; // selections will apply context clipping which needs to be restored

        if ( usePaintCanvas ) {
            // drawing is handled on a temporary, drawable Canvas
            this._paintCanvas = this._paintCanvas || getDrawableCanvas( this.getPaintSize() );
            ({ ctx } = this._paintCanvas );

            if ( selection ) {
                ctx.save();
                // note no offset is required when drawing on the full-size _paintCanvas
                clipContextToSelection( ctx, selection, 0, 0, this._invertSelection, overrides );
            }
        } else if ( selection ) {
            ctx.save();
            clipContextToSelection( ctx, selection, this.layer.left, this.layer.top, this._invertSelection );
        }

        if ( optAction ) {
            if ( optAction.type === "stroke" ) {
                ctx.strokeStyle = optAction.color;
                ctx.lineWidth   = ( optAction.size ?? 1 ) / this.canvas.documentScale;
                ctx.stroke();
            }
            this.handleRelease( 0, 0 ); // supplied outside actions are instantly completed actions
        } else if ( isFillMode ) {
            const color = this.getStore().getters.activeColor;
   
            if ( this.toolOptions.smartFill ) {
                // we need to translate pointer offset to match the relative, untransformed source layer content
                const point = rotatePointer( this._pointer, this.layer, width, height );
                floodFill( ctx, point.x, point.y, color );
            } else {
                ctx.fillStyle = this.getStore().getters.activeColor;
                if ( selection ) {
                    ctx.fill();
                } else {
                    ctx.fillRect( 0, 0, width, height );
                }
            }
        } else if ( isDrawing ) {
            if ( isCloneStamp ) {
                this._lastBrushIndex = renderClonedStroke( ctx, this._brush, this, pointers, overrides, this._lastBrushIndex );
            } else {
                this._lastBrushIndex = renderBrushStroke( ctx, this._brush, overrides, this._lastBrushIndex );
            }
        }
        
        if ( doSaveRestore ) {
            ctx.restore();
        }

        if ( !usePaintCanvas ) {
            // while user is drawing, the recache of filters is deferred to the handleRelease() handler
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
        this._orgSourceToStore = cloneCanvas( this.getPaintSource() ); // must be sync (otherwise single click paints lead to race conditions)
        this.debouncePaintStore();
    }

    debouncePaintStore( timeout: number = 5000 ): void {
        this._pendingPaintState = window.setTimeout( this.storePaintState.bind( this ), timeout );
    }

    usePaintCanvas(): boolean {
        // all drawing actions happen on a temporary canvas with the exception of selection-less
        // fill operations as these operate directly on the source layer
        const isFillMode = this._toolType === ToolTypes.FILL;
        return ( isFillMode && !!this._selection ) || this.isDrawing();
    }
    
    isPainting(): boolean {
        return !!this._paintCanvas; // while instance is declared, some painting operation is taking place
    }

    getPaintSource(): HTMLCanvasElement {
        return isMaskable( this.layer, this.getStore() ) ? this.layer.mask : this.layer.source;
    }

    getPaintSize(): Size {
        return this.canvas.getActiveDocument(); // always use the Document size to allow drawing on offset, cropped Layers
        /*
        // depending on zoom level, the interpolation when committing the drawableCanvas content onto the source
        // may benefit from a higher resolution when drawing on a zoomed in canvas. But maybe negligible and not worth memory overhead
        const { documentScale } = this.canvas;
        return constrain(
            fastRound( source.width  * documentScale ),
            fastRound( source.height * documentScale ),
            MAX_MEGAPIXEL
        );*/
    }

    async storePaintState(): Promise<boolean> {
        if ( !this._pendingPaintState ) {
            return true;
        }
        window.clearTimeout( this._pendingPaintState );
        if ( this.isDrawing() ) {
            // still drawing, debounce again (layer.source only updated on handleRelease())
            this.debouncePaintStore( 1000 );
            return false;
        }
        this._pendingPaintState = undefined;

        const original = this._orgSourceToStore; // grab reference to avoid race conditions while creating Blobs during continued painting
        this._orgSourceToStore = undefined;

        const newBlob  = await canvasToBlob( this.getPaintSource() );
        const newState = blobToResource( newBlob );
        const orgBlob  = await canvasToBlob( original );
        const orgState = blobToResource( orgBlob );
        
        replaceLayerSource( this.layer, orgState, newState, isMaskable( this.layer, this.getStore() ));

        return true;
    }

    /* the following override zCanvas.sprite or ZoomableSprite base classes */

    override setBounds( x: number, y: number, width = 0, height = 0 ): void {
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
        const newLeft = bounds.left;
        const newTop  = bounds.top;

        // update the Layer model by the relative offset
        // (because the renderer maintains an alternate position when the Layer is rotated)

        const newLayerX = layer.left + ( newLeft - left );
        const newLayerY = layer.top  + ( newTop  - top );

        layer.left = newLayerX;
        layer.top  = newLayerY;

        positionLayer( this.layer, oldLayerX, oldLayerY, newLayerX, newLayerY, left, top, newLeft, newTop );

        this.invalidateBlendCache();
    }

    /**
     * override that takes rotation into account
     * @todo: when migrating to zCanvas 6+ this is handled by zCanvas.sprite#insideBounds
     */
    override insideBounds( x: number, y: number ): boolean {
        const { left, top, width, height } = this.getActualBounds();
        return x >= left && x <= ( left + width ) &&
               y >= top  && y <= ( top  + height );
    }

    override handlePress( x: number, y: number, { type }: Event ): void {
        if ( type.startsWith( "touch" )) {
            this._pointer.x = x;
            this._pointer.y = y;
        }

        pauseBlendCaching( this.layerIndex, true );

        if ( this._isColorPicker ) {
            // color picker mode, get the color below the clicked point
            const local = globalToLocal( this.canvas, x, y );
            const p = ( this.canvas.getElement().getContext( "2d" ) as CanvasRenderingContext2D ).getImageData(
                local.x - ( this.canvas.getViewport().left * getPixelRatio() ),
                local.y - ( this.canvas.getViewport().top  * getPixelRatio() ),
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
                const { sourceLayerId } = this.toolOptions;
                const activeDocument = this.canvas.getActiveDocument();
                if ( sourceLayerId === TOOL_SRC_MERGED ) {
                    setCloneSource( createSyncSnapshot( activeDocument ));
                } else {
                    setCloneSource( createSyncSnapshot( activeDocument, [ activeDocument.layers.findIndex(({ id }) => id === sourceLayerId )]));
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

            if ( this.actionTarget === "mask" && canDragMask( this.layer, this.layer.mask )) {
                this._draggingMask = {
                    x: this._dragStartOffset.x + (( x - this._bounds.left ) - this._dragStartEventCoordinates.x ),
                    y: this._dragStartOffset.y + (( y - this._bounds.top )  - this._dragStartEventCoordinates.y ),
                };
            }
        }
    }

    override handleMove( x: number, y: number, event: Event ): void {
        // store reference to current pointer position (relative to canvas)
        // note that for touch events this is handled in handlePress() instead
        if ( !event.type.startsWith( "touch" )) {
            this._pointer.x = x;
            this._pointer.y = y;
        }

        if ( this._isDragMode ) {
            if ( this._draggingMask ) {
                let newMaskX = this._dragStartOffset.x + (( x - this._bounds.left ) - this._dragStartEventCoordinates.x );
                let newMaskY = this._dragStartOffset.y + (( y - this._bounds.top )  - this._dragStartEventCoordinates.y );
                this._draggingMask.x = this.layer.transform.mirrorX ? -newMaskX : newMaskX;
                this._draggingMask.y = this.layer.transform.mirrorY ? -newMaskY : newMaskY;
            } else if ( this._isDragMode ) {
                super.handleMove( x, y, event );
            }
        } else if ( this.isDrawing() ) {
            // enqueue current pointer position, painting of all enqueued pointers will be deferred
            // to the update()-hook, this prevents multiple renders on each move event
            this.storeBrushPointer( x, y );
        }
    }

    override handleRelease( _x: number, _y: number ): void {
        pauseBlendCaching( this.layerIndex, false );

        const { getters } = this.getStore();

        if ( this.isPainting() ) {
            // commit the drawable canvas content onto the destination source
            renderDrawableCanvas(
                this.getPaintSource().getContext( "2d" ), this.getPaintSize(), this.canvas, this._brush.options.opacity,
                this._toolType === ToolTypes.ERASER ? "destination-out" : undefined, this.layer
            );
            disposeMaskComposite();
            disposeDrawableCanvas();
            this.resetFilterAndRecache();

            this._paintCanvas = null;
            this._brush.down  = false;
            this._brush.last  = 0;
            this._brush.pointers.length = 0;
            setCloneSource( undefined );
            
            // immediately store pending history state when not running in lowMemory mode
            if ( !getters.getPreference( "lowMemory" )) {
                this.storePaintState();
            }
        }

        if ( this._isPaintMode ) {
            this.forceMoveListener(); // keeps the move listener active (to show brush outline while moving pointer)
        } else if ( this._isDragMode ) {
            if ( this._draggingMask ) {
                positionMask( this.layer, this._draggingMask.x, this._draggingMask.y );
                this._draggingMask = undefined;
            } else if ( getters.snapAlign ) {
                snapToGuide( this, this.canvas.guides ); // snap to guide
            }
            this.canvas.draggingSprite = null;
        }
    }

    override update(): void {
        if ( this.isDrawing() ) {
            this.paint();
            this._brush.last = this._brush.pointers.length;
        }
    }

    override drawCropped( canvasContext: CanvasRenderingContext2D, bitmap: HTMLCanvasElement, transformedBounds: TransformedDrawBounds ): void {
        if ( !isScaled( this.layer ) ) {
            return super.drawCropped( canvasContext, bitmap, transformedBounds );
        }
        const scale = 1 / this.layer.transform.scale;
        const { src, dest } = transformedBounds;
        canvasContext.drawImage(
            bitmap,
            ( HALF + src.left   * scale ) << 0,
            ( HALF + src.top    * scale ) << 0,
            ( HALF + src.width  * scale ) << 0,
            ( HALF + src.height * scale ) << 0,
            ( HALF + dest.left )   << 0,
            ( HALF + dest.top )    << 0,
            ( HALF + dest.width )  << 0,
            ( HALF + dest.height ) << 0
        );
    }

    override draw( documentContext: CanvasRenderingContext2D, viewport: Viewport, isSnapshotMode = false ): void {
        let renderedFromCache = false;
        if ( !isSnapshotMode && useBlendCaching() && !this._pendingEffectsRender ) {
            const { layerIndex } = this;
            if ( isBlendCached( layerIndex )) {
                return; // render will be executed by higher order layer
            }
            if ( hasBlend( this.layer )) {
                let bitmap = getBlendCache( layerIndex );
                const document = this.canvas.getActiveDocument();
                if ( !bitmap ) {
                    bitmap = createSyncSnapshot( document, getBlendableLayers());
                    cacheBlendedLayer( layerIndex, bitmap );
                }
                const pixelRatio = getPixelRatio();
                documentContext.drawImage(
                    bitmap, -fastRound( viewport.left ), -fastRound( viewport.top ),
                    fastRound( bitmap.width / pixelRatio ), fastRound( bitmap.height / pixelRatio )
                );
                renderedFromCache = true;
            }
        }

        if ( !renderedFromCache ) {
            drawBounds = this._bounds;

            const { enabled, blendMode, opacity } = this.layer.filters;
            const altOpacity = enabled && opacity !== 1;
            if ( altOpacity ) {
                documentContext.globalAlpha = opacity;
            }
            let drawContext: CanvasRenderingContext2D = documentContext;

            const isPainting      = this.isPainting();
            const isErasing       = isPainting && this._toolType === ToolTypes.ERASER;
            const isDrawingOnMask = isPainting && isMaskable( this.layer, this.getStore() );
            const applyBlending   = enabled && blendMode !== BlendModes.NORMAL && !isDrawingOnMask;

            if ( applyBlending ) {
                drawContext = getBlendContext( documentContext.canvas );
                drawContext.globalAlpha = altOpacity ? opacity : 1;
                const scaleFactor = isSnapshotMode ? getPixelRatio() : getPixelRatio() * this.canvas.zoomFactor;
                drawContext.scale( scaleFactor, scaleFactor );
            }

            let maskComposite: CanvasContextPairing | undefined;
            if ( isDrawingOnMask ) {
                maskComposite = getMaskComposite( this.getPaintSize() ); // temporary canvas to combine paintCanvas with source
              
                if ( !isErasing ) {
                    drawContext = maskComposite.ctx;
                }
            }
            drawContext.save(); // transformation save()

            const transformedBounds = applyTransformation( drawContext, this.layer, viewport );
            const transformCanvas   = !!transformedBounds;

            if ( transformCanvas ) {
                drawBounds = transformedBounds;
            }

            if ( this._draggingMask ) {
                const composite = getMaskComposite({ width: this.layer.mask.width, height: this.layer.mask.height });
                maskImage(
                    composite.ctx, this._unmaskedBitmap!, this.layer.mask,
                    this._unmaskedBitmap!.width, this._unmaskedBitmap!.height, this._draggingMask.x, this._draggingMask.y
                );
                this.drawBitmap( documentContext, composite.cvs, transformCanvas ? undefined : viewport, drawBounds );
            } else if ( this._bitmapReady && ( !isErasing || isDrawingOnMask )) {
                // invoke base class behaviour to render bitmap
                this.drawBitmap( drawContext, this._bitmap as HTMLCanvasElement, transformCanvas ? undefined : viewport, drawBounds );
            }

            if ( isErasing ) {
                const maskedSource = cloneCanvas( isDrawingOnMask ? this._unmaskedBitmap : this._bitmap as HTMLCanvasElement );
                renderDrawableCanvas(
                    maskedSource.getContext( "2d" )!, this.getPaintSize(), this.canvas,
                    this._brush.options.opacity, "destination-out", this.layer
                );
                if ( isDrawingOnMask ) {
                    const tempMask = cloneCanvas( this._bitmap as HTMLCanvasElement );
                    maskImage( tempMask.getContext( "2d" )!, this._unmaskedBitmap, maskedSource, this.layer.source.width, this.layer.source.height, this.layer.maskX, this.layer.maskY );
                    this.drawBitmap( documentContext, tempMask, transformCanvas ? undefined : viewport, drawBounds );
                } else {
                    this.drawBitmap( drawContext, maskedSource, transformCanvas ? undefined : viewport, drawBounds );
                }
            }

            if ( applyBlending ) {
                blendLayer( documentContext, drawContext, blendMode );
            }
            
            drawContext.restore(); // transformation restore()

            // user is currently drawing on this layer, render contents of drawableCanvas onto screen for live preview
            if ( isPainting && !isErasing ) {
                const clipContext = !this._selection && ( this._bounds.left !== 0 || this._bounds.top !== 0 || transformedBounds );
                if ( clipContext ) {
                    // when the layer if offset/transformed and there is no active selection, clip the out of bounds content
                    documentContext.save();
                    clipLayer( documentContext, this.layer, this._bounds, viewport, false );
                }
                renderDrawableCanvas(
                    isDrawingOnMask ? drawContext : documentContext, this.getPaintSize(), this.canvas, this._brush.options.opacity,
                    this._toolType === ToolTypes.ERASER || isMaskable( this.layer, this.getStore() ) ? "destination-out" : undefined,
                );
                if ( isDrawingOnMask ) {
                    documentContext.drawImage( maskComposite.cvs, 0, 0 ); // draw temporary masked canvas onto underlying document
                }
                if ( clipContext ) {
                    documentContext.restore();
                }
            }

            if ( altOpacity ) {
                documentContext.globalAlpha = 1; // restore document opacity
            }
        }

        // render brush outline at pointer position

        if ( !isSnapshotMode && this._isPaintMode ) {
            renderBrushOutline(
                documentContext, this.canvas, viewport, this._toolType, this.toolOptions,
                this._brush, this._pointer, this.cloneStartCoords ?? this._dragStartEventCoordinates
            );
        }
    }

    dispose(): void {
        super.dispose();

        flushLayerCache( this.layer );

        this._bitmap = null;
        this._unmaskedBitmap = null;
    }
};
