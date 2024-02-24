/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
import type { Point, Rectangle } from "zcanvas";
import type ZoomableCanvas from "./zoomable-canvas";
import ZoomableSprite from "./zoomable-sprite";
import type { Viewport, IRenderer } from "zcanvas";
import { createCanvas, canvasToBlob, globalToLocal } from "@/utils/canvas-util";
import { renderCross } from "@/utils/render-util";
import { blobToResource } from "@/utils/resource-manager";
import { BlendModes } from "@/definitions/blend-modes";
import { getSizeForBrush } from "@/definitions/brush-types";
import type { Document, Layer, Shape, Selection } from "@/definitions/document";
import type { CanvasContextPairing, CanvasDrawable, Brush, BrushToolOptions, BrushAction } from "@/definitions/editor";
import { LayerTypes } from "@/definitions/layer-types";
import ToolTypes, { canDrawOnSelection } from "@/definitions/tool-types";
import { radiansToDegrees } from "@/math/unit-math";
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
    getTempCanvas, renderTempCanvas, disposeTempCanvas, slicePointers, createOverrideConfig
} from "@/rendering/lowres";
import BrushFactory from "@/factories/brush-factory";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import { enqueueState } from "@/factories/history-state-factory";
import { getLastShape } from "@/utils/selection-util";
import { isShapeClosed } from "@/utils/shape-util";
import type { BitMapperyState } from "@/store";

const HALF   = 0.5;
const TWO_PI = 2 * Math.PI;

/**
 * A LayerSprite is the renderer for a Documents Layer.
 * It handles all tool interactions with the layer and also provides interaction with the Layers Mask.
 * It inherits from the zCanvas Sprite to be an interactive Canvas drawable.
 */
class LayerSprite extends ZoomableSprite {
    public layer: Layer;
    public actionTarget: "source" | "mask";
    public canvas: ZoomableCanvas; // set through inherited addChild() method
    public tempCanvas: CanvasContextPairing;
    public cloneStartCoords: Point | null;
    public toolOptions: any;

    protected _pointerX: number;
    protected _pointerY: number;
    protected _brush: Brush;
    protected _isPaintMode: boolean;
    protected _isDragMode: boolean;
    protected _isColorPicker: boolean;
    protected _selection: Selection;
    protected _invertSelection: boolean;
    protected _toolType: ToolTypes;
    protected _orgSourceToStore: string | null;
    protected _pendingPaintState: number | null;
    protected _rafFx: boolean;

    constructor( layer: Layer ) {
        const { left, top, width, height } = layer;
        super({ x: left, y: top, width, height, resourceId: layer.id });

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

    getDragStartOffset(): Point {
        return this._dro;
    }

    getDragStartEventCoordinates(): Point {
        return this._drc;
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

    // invoked whenever the effects of the Layer have changed

    syncEffects(): void {
        if ( this.isRotated() ) {
            this.setRotation( radiansToDegrees( this.layer.effects.rotation ));
        }
        if ( this.isScaled() ) {
            this.setScale( this.layer.effets.scale );
        }
        this.invalidate();
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

    setBitmap( source: CanvasDrawable ): void {
        this.canvas.loadResource( this._resourceId, source )
            .then(({ width, height }) => {
                console.info('--- loaded resource for:'+this.layer.id+ ' w/id:'+this._resourceId);
                this.setResource( this._resourceId, width, height );
            });
    }

    async getBitmap(): Promise<HTMLCanvasElement | undefined> {
        return this.canvas.getContent( this._resourceId );
    }

    handleActiveLayer({ id }: Layer ): void {
        this.setInteractive( this.layer.id === id );
    }

    setSelection( document: Document, onlyWhenClosed = false ): void {
        const { activeSelection } = document;
        if ( !onlyWhenClosed || ( isShapeClosed( getLastShape( activeSelection )) && canDrawOnSelection( this.layer ))) {
            this._selection = activeSelection?.length > 0 ? activeSelection : null;
        } else {
            this._selection = null;
        }
        this._invertSelection = this._selection && document.invertSelection;
    }

    handleActiveTool( tool: ToolTypes, toolOptions: any, activeDocument: Document ): void {
        this.isDragging        = false;
        this._isPaintMode      = false;
        this._isDragMode       = false;
        this._isColorPicker    = false;
        this._selection        = null;
        this._toolType         = null;
        this.toolOptions       = null;
        this.cloneStartCoords  = null;

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
        this._dro = { x: this.getX(), y: this.getY() };
        this._drc = { x: this._pointerX, y: this._pointerY };
    }

    // draw onto the source Bitmap (e.g. brushing / fill tool / eraser)

    paint( optAction: BrushAction = null ): void {
        if ( !this._pendingPaintState ) {
            this.preparePendingPaintState();
        }
        const { mirrorX, mirrorY } = this.layer.effects;

        const drawOnMask   = this.isMaskable();
        const isEraser     = this._toolType === ToolTypes.ERASER;
        const isCloneStamp = this._toolType === ToolTypes.CLONE;
        const isFillMode   = this._toolType === ToolTypes.FILL;

        // get the drawing context
        let ctx = ( drawOnMask ? this.layer.mask : this.layer.source ).getContext( "2d" );
        const { width, height } = ctx.canvas;

        ctx.save(); // 1. preparation save()

        // as long as the brush is held down, render paint in low res preview mode
        // unless we are erasing contents on a layer mask
        const isLowResPreview = this._brush.down && !( drawOnMask && isEraser );

        // if there is an active selection, painting will be constrained within
        let selection: Selection = optAction?.selection || this._selection;
        if ( selection ) {
            let { left, top } = this.layer;
            if ( this.isRotated() && !isLowResPreview ) {
                selection = selection.map(( shape: Shape ) => rotatePointers( shape as Point[], this.layer, width, height ));
                left = top = 0; // pointers have been rotated within clipping context
            }
            ctx.save(); // 2. clipping save()
            clipContextToSelection( ctx, selection, left, top, this._invertSelection );
        }

        if ( optAction ) {
            if ( optAction.type === "stroke" ) {
                ctx.strokeStyle = optAction.color;
                ctx.lineWidth   = ( optAction.size || 1 ) / this.canvas.documentScale;
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
        } else {
            // get the enqueued pointers which are to be rendered in this paint cycle
            const pointers = slicePointers( this._brush );

            if ( isCloneStamp ) {
                if ( isLowResPreview ) {
                    renderClonedStroke( ctx, this._brush, this, this.toolOptions.sourceLayerId,
                        rotatePointers( pointers, this.layer, width, height )
                    );
                    // clone operation is direct-to-Layer-source
                    this.setBitmap( ctx.canvas );
                }
            } else {
                const orgContext = ctx;

                // brush operations are done on a lower resolution canvas during live update
                // where each individual brush stroke is rendered in successive iterations.
                // upon release, the full stroke is rendered on the Layer source (see handleRelease())
                let overrides = null;
                if ( isLowResPreview ) {
                    // live update on lower resolution canvas
                    this.tempCanvas = this.tempCanvas || getTempCanvas( this.canvas );
                    overrides = createOverrideConfig( this.canvas, pointers );
                    ctx = this.tempCanvas.ctx;

                    if ( selection && this.tempCanvas ) {
                        ctx.save(); // 3. tempCanvas clipping save()
                        clipContextToSelection( ctx, selection, 0, 0, this._invertSelection, overrides );
                    }
                } else {
                    // render full brush stroke path directly onto the Layer source
                    ctx = createCanvas( orgContext.canvas.width, orgContext.canvas.height ).ctx;
                    // take optional layer scaling into account
                    const scale = 1 / this.layer.effects.scale;
                    ctx.translate(
                        ( this.layer.width  / 2 ) - ( this.layer.width  * scale ) / 2,
                        ( this.layer.height / 2 ) - ( this.layer.height * scale ) / 2
                    );
                    // transform destination context in case the current layer is rotated or mirrored
                    ctx.scale( mirrorX ? -1 : 1, mirrorY ? -1 : 1 );
                    this._brush.pointers = rotatePointers( this._brush.pointers, this.layer, width, height ).map(({ x, y }) => ({ x: x * scale, y: y * scale }));
                }
                renderBrushStroke( ctx, this._brush, overrides );

                if ( !isLowResPreview ) {
                    // draw the temp context with the fully rendered brush path
                    // onto the destination Layer source, at the given opacity (prevents overdraw)
                    orgContext.globalAlpha = this._brush.options.opacity;
                    if ( isEraser ) {
                        orgContext.globalCompositeOperation = "destination-out";
                    }
                    orgContext.drawImage( ctx.canvas, 0, 0 );
                    ctx = orgContext;
                } else if ( selection && this.tempCanvas ) {
                    orgContext.restore(); // 3. tempCanvas clipping restore()
                }
            }
        }
        if ( selection ) {
            ctx.restore(); // 2. clipping restore()
        }
        ctx.restore(); // 1. preparation restore()

        // during low res preview brushing, defer recache of filters to handleRelease()
        if ( !isLowResPreview ) {
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
        canvasToBlob( this.layer.source ).then( blob => {
            this._orgSourceToStore = blobToResource( blob );
        });
        this.debouncePaintStore();
    }

    debouncePaintStore( timeout: number = 5000 ): void {
        this._pendingPaintState = setTimeout( this.storePaintState.bind( this ), timeout ) as unknown as number;
    }

    async storePaintState(): Promise<boolean> {
        if ( !this._pendingPaintState ) {
            return true;
        }
        clearTimeout( this._pendingPaintState );
        if ( this._brush.down ) {
            // still painting, debounce again (layer.source only updated on handleRelease())
            this.debouncePaintStore( 1000 );
            return false;
        }
        this._pendingPaintState = null;
        const layer    = this.layer;
        const orgState = this._orgSourceToStore;

        this._orgSourceToStore = null;

        const blob = await canvasToBlob( layer.source );
        const newState = blobToResource( blob );
        enqueueState( `spritePaint_${layer.id}`, {
            undo(): void {
                restorePaintFromHistory( layer, orgState! );
            },
            redo(): void {
                restorePaintFromHistory( layer, newState);
            },
            resources: [ orgState, newState ],
        });
        return true;
    }

    /* the following override zCanvas.Sprite methods */

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

    override handlePress( x: number, y: number, { type }: Event ): void {
        if ( type.startsWith( "touch" )) {
            this._pointerX = x;
            this._pointerY = y;
        }
        if ( this._isColorPicker ) {
            // color picker mode, get the color below the clicked point
            const local = globalToLocal( this.canvas, x, y );
            this.canvas.getContent().then( cvs => {
                const p = cvs.getContext( "2d" )!.getImageData(
                    local.x - this.canvas.getViewport()!.left,
                    local.y - this.canvas.getViewport()!.top,
                    1, 1
                ).data;
                this.getStore().commit( "setActiveColor", `rgba(${p[0]},${p[1]},${p[2]},${(p[3]/255)})` );
            });
        }
        else if ( this._isPaintMode ) {
            if ( this._toolType === ToolTypes.CLONE ) {
                // pressing down when using the clone tool with no coords defined in the toolOptions,
                // sets the source coords (within the source Layer)
                if ( !this.toolOptions.coords ) {
                    this.toolOptions.coords = { x, y };
                    this.cloneStartCoords = null;
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
        } else if ( this._isDragMode ) {
            this.canvas.draggingSprite = this;
        }
    }

    override handleMove( x: number, y: number, event: Event ): void {
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
                const newMaskX = this._dro.x + (( x - this._bounds.left ) - this._drc.x );
                const newMaskY = this._dro.y + (( y - this._bounds.top )  - this._drc.y );
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
        if ( this._brush.down ) {
            // enqueue current pointer position, painting of all enqueued pointers will be deferred
            // to the update()-hook, this prevents multiple renders on each move event
            this.storeBrushPointer( x, y );
        }
    }

    override handleRelease( /*x: number, y: number*/ ): void {
        const { getters } = this.getStore();
        if ( this._brush.down ) {
            // brushing was active, deactivate brushing and render the
            // high resolution version of the brushed path onto the Layer source
            disposeTempCanvas();
            this.tempCanvas  = null;
            this._brush.down = false;
            this._brush.last = 0;
            this.paint();
            this._brush.pointers = []; // pointers have been rendered, reset
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

    override update(): void {
        if ( this._brush.down ) {
            this.paint();
            this._brush.last = this._brush.pointers.length;
        }
    }

    drawCropped( renderer: IRenderer, transformedBounds: { src: Rectangle, dest: Rectangle } ): void {
        if ( !this.isScaled() ) {
            return super.drawCropped( renderer, transformedBounds );
        }
        const scale = 1 / this.layer.effects.scale;
        const { src, dest } = transformedBounds;
        // @TODO can this just be replaced with the scale on the draw props object?
        renderer.drawImageCropped(
            this._resourceId,
            src.left * scale, src.top * scale, src.width * scale, src.height * scale,
            dest.left, dest.top, dest.width, dest.height,
            this.getDrawProps()
        );
    }

    // @ts-expect-error incompatible override
    override draw( renderer: IRenderer, viewport: Viewport, isHighresExport = false ): void {
        let drawContext: CanvasRenderingContext2D | undefined; // only when blending
       
        const { enabled, blendMode, opacity } = this.layer.filters;
        const altOpacity = enabled && opacity !== 1;
        if ( altOpacity ) {
            renderer.setAlpha( opacity ); // TODO to DrawProps
        }
        const applyBlending = enabled && blendMode !== BlendModes.NORMAL;

        if ( applyBlending ) {
            drawContext = getBlendContext( this.canvas.getElement() );
            if ( !isHighresExport ) {
                renderer.scale( this.canvas.zoomFactor, this.canvas.zoomFactor );
            }
        }

        // renderer.save(); // 1. transformation save()

        // const transformedBounds = applyTransformation( renderer, this.layer, viewport );
    //    const transformCanvas   = transformedBounds !== null;

        // invoke base ZoomableSprite-class behaviour to render bitmap
        super.draw( renderer, viewport );

        if ( applyBlending ) {
            blendLayer( this.canvas, drawContext!, blendMode );
        }

        // renderer.restore(); // 1. transformation restore()

        // sprite is currently brushing, render low resolution temp contents onto screen
        if ( this.tempCanvas ) {
            renderer.save(); // 2. low res render save()
            renderer.setAlpha( this._brush.options.opacity ); // @todo to DrawProps
            if ( this._toolType === ToolTypes.ERASER || this.isMaskable() ) {
                renderer.setBlendMode( "destination-out" ); // @todo to DrawProps
            }
            // @todo second argument should be a context...
            renderTempCanvas( this.canvas, renderer );
            renderer.restore(); // 2. low res render restore()
        }

        if ( altOpacity ) {
            renderer.setAlpha( 1 ); // restore document opacity // @todo to DrawProps
        }

        // render brush outline at pointer position

        if ( !isHighresExport && this._isPaintMode ) {
            const { zoomFactor } = this.canvas;
            const tx = this._pointerX - viewport.left;
            const ty = this._pointerY - viewport.top;

            const stroke = { size: 2 / zoomFactor, color: "#999" }; // @todo cache
            
            if ( this._toolType === ToolTypes.CLONE ) {
                const { coords } = this.toolOptions;
                const relSource = this.cloneStartCoords ?? this._drc;
                const cx = coords ? ( coords.x - viewport.left ) + ( this._pointerX - relSource.x ) : tx;
                const cy = coords ? ( coords.y - viewport.top  ) + ( this._pointerY - relSource.y ) : ty;
                // when no source coordinate is set, or when applying the clone stamp, we show a cross to mark the origin
                if ( !coords || this._brush.down ) {
                    renderCross( renderer, cx, cy, this._brush.radius / zoomFactor, stroke );
                }
            }

            const drawBrushOutline = this._toolType !== ToolTypes.CLONE || !!this.toolOptions.coords;
            if ( drawBrushOutline ) {
                // any other brush mode state shows brush outline
                renderer.drawCircle( tx, ty, getSizeForBrush( this._brush ), undefined, stroke );
            }
        }
    }

    override dispose(): void {
        this.canvas.disposeResource( this._resourceId );
        super.dispose();

        flushLayerCache( this.layer );
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

function restorePaintFromHistory( layer: Layer, state: string ): void {
    const ctx = layer.source.getContext( "2d" );
    ctx.clearRect( 0, 0, layer.source.width, layer.source.height );
    const image  = new Image();
    image.onload = () => {
        ctx.drawImage( image, 0, 0 );
        getSpriteForLayer( layer )?.resetFilterAndRecache();
    };
    image.src = state;
}
