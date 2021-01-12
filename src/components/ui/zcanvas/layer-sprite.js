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
import Vue from "vue";
import { sprite } from "zcanvas"
import { createCanvas, resizeImage, globalToLocal } from "@/utils/canvas-util";
import { renderCross, renderMasked } from "@/utils/render-util";
import { LAYER_GRAPHIC, LAYER_MASK, LAYER_TEXT } from "@/definitions/layer-types";
import {
    isPointInRange, translatePointerRotation, rotatePoints, rectangleToCoordinates
} from "@/math/image-math";
import { getRectangleForSelection, isSelectionClosed } from "@/math/selection-math";
import { renderEffectsForLayer } from "@/services/render-service";
import { flushLayerCache, clearCacheProperty } from "@/services/caches/bitmap-cache";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import { enqueueState } from "@/factories/history-state-factory";
import ToolTypes, { canDrawOnSelection } from "@/definitions/tool-types";

/**
 * A LayerSprite is the renderer for a Documents Layer.
 * It handles all tool interactions with the layer and also provides interaction with the Layers Mask.
 * It inherits from the zCanvas Sprite to be an interactive Canvas drawable.
 */
class LayerSprite extends sprite {
    constructor( layer ) {
        const { bitmap, x, y, width, height } = layer;
        super({ bitmap, x, y, width, height }); // zCanvas inheritance

        this.layer = layer; // the Layer this Sprite will be rendering

        if ([ LAYER_GRAPHIC, LAYER_TEXT ].includes( layer.type ) && !layer.source ) {
            // create a Canvas on which this layer will render its drawable content.
            const { cvs } = createCanvas( layer.width, layer.height );
            layer.source = cvs;
        }

        // create brush (used for both drawing on LAYER_GRAPHIC types and to create layer masks)
        const brushCanvas = createCanvas();
        this._brushCvs    = brushCanvas.cvs;
        this._brushCtx    = brushCanvas.ctx;
        this._halfRadius  = 0;
        this._pointerX    = 0;
        this._pointerY    = 0;

        this.cacheBrush( this.canvas?.store.getters.activeColor || "rgba(255,0,0,1)" );
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

    setActionTarget( target = "source" ) {
        this.actionTarget = target;
    }

    isDrawable() {
        return this.layer.type === LAYER_GRAPHIC || this.isMaskable();
    }

    isMaskable() {
        return !!this.layer.mask;
    }

    isRotated() {
        return ( this.layer.effects.rotation % 360 ) !== 0;
    }

    cacheBrush( color, radius = 30 ) {
        this._radius = radius;

        const innerRadius = radius / 10;
        const outerRadius = radius * 2;

        const x = radius;
        const y = radius;

        // update brush Canvas size
        this._brushCvs.width  = outerRadius;
        this._brushCvs.height = outerRadius;

        if ( !this._brushCtx ) {
            return; // TODO: this is because in Jenkins on Linux there is no canvas mock available
        }

        const gradient = this._brushCtx.createRadialGradient( x, y, innerRadius, x, y, outerRadius );
        gradient.addColorStop( 0, color );

        let color2 = "rgba(255,255,255,0)";
/*
        if ( color.startsWith( "rgba" )) {
            const [r, g, b, a] = color.split( "," );
            color2 = `${r},${g},${b},0)`;
        }
*/
        gradient.addColorStop( 1, color2 );

        this._brushCtx.clearRect( 0, 0, this._brushCvs.width, this._brushCvs.height );
        this._brushCtx.arc( x, y, radius, 0, 2 * Math.PI );
        this._brushCtx.fillStyle = gradient;
        this._brushCtx.fill();

        this._halfRadius = radius / 2;
    }

    cacheEffects() {
        if ( this._rafFx ) {
            return; // debounced to only occur once before next render cycle
        }
        this._rafFx = true;
        requestAnimationFrame( async () => {
            await renderEffectsForLayer( this.layer );
            this._rafFx = false;
        });
    }

    resetFilterAndRecache() {
        clearCacheProperty( this.layer, "filterData" ); // filter must be applied to new contents
        this.cacheEffects(); // sync mask and source changes with sprite Bitmap
    }

    getBitmap() {
        return this._bitmap;
    }

    handleActiveTool( tool, toolOptions, activeLayer ) {
        this.isDragging     = false;
        this._isPaintMode   = false;
        this._isSelectMode  = false;
        this._isColorPicker = false;
        this._hasSelection  = false;
        this._toolOptions   = null;

        this.setInteractive( this.layer === activeLayer );

        if ( !this._interactive ) {
            return;
        }
        this._isDragMode        = tool === ToolTypes.DRAG;
        this._isRectangleSelect = tool === ToolTypes.SELECTION;
        this._toolType          = tool;
        this._toolOptions       = toolOptions;

        // note we use setDraggable() even outside of ToolTypes.DRAG
        // this is because draggable zCanvas.sprites will trigger the handleMove()
        // handler on pointer events. We override handleMove() for tool specific behaviour.

        switch ( tool ) {
            default:
                this.setDraggable( false );
                break;
            case ToolTypes.DRAG:
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

                // drawable tools can work alongside an existing selection
                const selection = activeLayer.selection;
                if ( isSelectionClosed( selection ) && canDrawOnSelection( activeLayer )) {
                    this._hasSelection    = true;
                    this._selectionClosed = true;
                } else {
                    this._hasSelection = false;
                    this.resetSelection();
                }
                break;
            case ToolTypes.SELECTION:
            case ToolTypes.LASSO:
                this.forceMoveListener();
                this.setDraggable( true );
                this._isSelectMode = true;
                this._hasSelection = activeLayer.selection?.length > 0;
                break;
            case ToolTypes.EYEDROPPER:
                this._isColorPicker = true;
                break;
        }
        if ( !this._isPaintMode ) {
            this.resetSelection();
        }
        this.invalidate();
    }

    resetSelection() {
        const selection = this.layer.selection || [];
        if ( this._isSelectMode ) {
            this.setSelection( [] );
            storeSelectionHistory( this, selection );
        } else {
            Vue.delete( this.layer, "selection" );
        }
        this._selectionClosed = false;
        this.invalidate();
    }

    setSelection( value ) {
        Vue.set( this.layer, "selection", value );
        this._selectionClosed = value.length > 1; // TODO: can we determine this from first and last point?
        this.invalidate();
    }

    selectAll() {
        this.setSelection( rectangleToCoordinates( this._bounds.left, this._bounds.top, this._bounds.width, this._bounds.height ));
        this._isSelectMode = true;
    }

    // cheap way to hook into zCanvas.handleMove()-handler so we can keep following the cursor in tool modes
    forceMoveListener() {
        this.isDragging       = true;
        this._dragStartOffset = { x: this.getX(), y: this.getY() };
        this._dragStartEventCoordinates = { x: this._pointerX, y: this._pointerY };
    }

    paint( x, y ) {
        // translate pointer to translated space, when layer is rotated or mirrored
        const { mirrorX, mirrorY, rotation } = this.layer.effects;
        const rotCenterX = this._bounds.left + this._bounds.width  / 2;
        const rotCenterY = this._bounds.top  + this._bounds.height / 2;

        if ( this.isRotated() ) {
            ({ x, y } = translatePointerRotation( x, y, rotCenterX, rotCenterY, rotation ));
        }
        const drawOnMask   = this.isMaskable();
        const isEraser     = this._toolType === ToolTypes.ERASER;
        const isCloneStamp = this._toolType === ToolTypes.CLONE;
        const isFillMode   = this._toolType === ToolTypes.FILL;

        // get the drawing context
        const ctx = ( drawOnMask ? this.layer.mask : this.layer.source ).getContext( "2d" );
        const { width, height } = ctx.canvas;

        ctx.save();

        if ( isEraser ) {
            ctx.globalCompositeOperation = "destination-out";
        }

        if ( mirrorX ) {
            x -= width;
        }
        if ( mirrorY ) {
            y -= height;
        }
        // correct pointer offset w/regards to layer pan position
        x -= this.layer.x;
        y -= this.layer.y;

        // if there is an active selection, painting will be constrained within

        if ( this.layer.selection ) {
            let selectionPoints = this.layer.selection;
            let sX = this._bounds.left;
            let sY = this._bounds.top;
            if ( this.isRotated() ) {
                selectionPoints = rotatePoints( selectionPoints, rotCenterX, rotCenterY, rotation );
                const rect = getRectangleForSelection( selectionPoints );
                // TODO: 0, 0 coordinate is fine when layer isn't panned...
                //const pts = translatePointerRotation( 0, 0, rect.width / 2, rect.height / 2, rotation );
                //console.warn(pts);
                sX = 0;//pts.x;
                sY = 0;//pts.y;
            }
            ctx.beginPath();
            selectionPoints.forEach(( point, index ) => {
                ctx[ index === 0 ? "moveTo" : "lineTo" ]( point.x - sX, point.y - sY );
            });
            if ( !isFillMode ) {
                ctx.clip();
            }
        }

        // transform destination context in case the current layer is rotated or mirrored
        ctx.scale( mirrorX ? -1 : 1, mirrorY ? -1 : 1 );
        ctx.translate( x, y );
        ctx.rotate( rotation );
        ctx.translate( -x, -y );

        if ( isFillMode ) {
            ctx.fillStyle = this.canvas?.store.getters.activeColor;
            if ( this.layer.selection ) {
                ctx.fill();
                ctx.closePath(); // is this necessary ?
            } else {
                ctx.fillRect( 0, 0, width, height );
            }
        } else {

            // TODO: when rotated and mirrored, x and y are now in right coordinate space, but not at right point

            if ( isCloneStamp ) {
                renderMasked(
                    ctx, this, x, y,
                    getSpriteForLayer({ id: this._toolOptions.sourceLayerId }), // TODO: fugly!!
                    this._brushCvs, this._radius
                );
            } else {
                ctx.drawImage( this._brushCvs, x - this._radius, y - this._radius );
            }
        }
        ctx.restore();
        this.resetFilterAndRecache();
    }

    /* the following override zCanvas.sprite */

    setBounds( x, y, width = 0, height = 0 ) {
        const bounds = this._bounds;
        const layer  = this.layer;

        // store current values (for undo)
        const { left, top } = bounds;
        const oldLayerX = layer.x;
        const oldLayerY = layer.y;

        if ( width === 0 || height === 0 ) {
            ({ width, height } = bounds );
        }
        // commit change
        super.setBounds( x, y, width, height );

        // store new value (for redo)
        const newX = bounds.left;
        const newY = bounds.top;

        // update the Layer model by the relative offset
        // (because the Sprite has an alternate position when rotated)

        const newLayerX = layer.x + ( newX - left );
        const newLayerY = layer.y + ( newY - top );

        layer.x = newLayerX;
        layer.y = newLayerY;

        const sprite = this;

        enqueueState( `spritePos_${layer.id}`, {
            undo() {
                bounds.left = left;
                bounds.top  = top;
                layer.x     = oldLayerX;
                layer.y     = oldLayerY;
                sprite.invalidate();
            },
            redo() {
                bounds.left = newX;
                bounds.top  = newY;
                layer.x     = newLayerX;
                layer.y     = newLayerY;
                sprite.invalidate();
            }
        });
        this.invalidate();
    }

    handleMove( x, y, { type }) {
        // store reference to current pointer position (relative to canvas)
        // note that for touch events this is handled in handlePress() instead
        if ( !type.startsWith( "touch" )) {
            this._pointerX = x;
            this._pointerY = y;
        }

        let recacheEffects = false;

        if ( !this._isPaintMode ) {
            // not drawable, perform default behaviour (drag)
            if ( this.actionTarget === "mask" ) {
                this.layer.maskX = this._dragStartOffset.x + (( x - this._bounds.left ) - this._dragStartEventCoordinates.x );
                this.layer.maskY = this._dragStartOffset.y + (( y - this._bounds.top )  - this._dragStartEventCoordinates.y );
                this.resetFilterAndRecache();
            } else if ( this._isDragMode /*!this._isSelectMode*/ ) {
                super.handleMove( x, y );
                return;
            }
        }

        // brush tool active (either draws/erases onto IMAGE_GRAPHIC layer source or on the mask bitmap)
        if ( this._applyPaint ) {
            this.paint( x, y );
        }
    }

    handlePress( x, y, { type }) {
        if ( type.startsWith( "touch" )) {
            this._pointerX = x;
            this._pointerY = y;
        }
        if ( this._isColorPicker ) {
            // color picker mode, get the color below the clicked point
            const local = globalToLocal( this.canvas, x, y );
            const p = this.canvas.getElement().getContext( "2d" ).getImageData(
                local.x - this.canvas._viewport.left,
                local.y - this.canvas._viewport.top,
                1, 1
            ).data;
            this.canvas.store.commit( "setActiveColor", `rgba(${p[0]},${p[1]},${p[2]},${(p[3]/255)})` );
        }
        else if ( this._isPaintMode ) {
            if ( this._toolType === ToolTypes.CLONE && !this._toolOptions.coords ) {
                // pressing down when using the clone tool with no coords yet defined, sets the source coords.
                this._toolOptions.coords = { x, y };
            } else if ( this._toolType === ToolTypes.FILL ) {
                this.paint( x, y );
            } else {
                // for any other brush mode state, set the brush application to true (will be applied in handleMove())
                this._applyPaint = true;
            }
        }
        else if ( this._isSelectMode && !this._selectionClosed ) {
            // selection mode, set the click coordinate as the first point in the selection
            const firstPoint = this.layer.selection[ 0 ];
            let storeHistory = false;
            if ( firstPoint && isPointInRange( x, y, firstPoint.x, firstPoint.y )) {
                this._selectionClosed = true;
                x = firstPoint.x;
                y = firstPoint.y;
                storeHistory = true;
            }
            this.layer.selection.push({ x, y });
            if ( storeHistory ) {
                storeSelectionHistory( this );
            }
        }
    }

    handleRelease( x, y ) {
        this._applyPaint = false;
        if ( this._isPaintMode || this._isSelectMode ) {
            this.forceMoveListener(); // keeps the move listener active
            if ( this._isRectangleSelect && this.layer.selection.length > 0 ) {
                // when releasing in rectangular select mode, set the selection to
                // the bounding box of the down press coordinate and this release coordinate
                const firstPoint = this.layer.selection[ 0 ];
                this.layer.selection = rectangleToCoordinates( firstPoint.x, firstPoint.y, x - firstPoint.x, y - firstPoint.y );
                this._selectionClosed = true;
                storeSelectionHistory( this );
            }
        }
    }

    draw( documentContext, viewport ) {
        // invoke base class behaviour to render bitmap
        super.draw( documentContext, viewport );

        // render brush outline at pointer position
        if ( this._isPaintMode ) {
            const drawBrushOutline = this._toolType !== ToolTypes.CLONE || !!this._toolOptions.coords;
            if ( this._toolType === ToolTypes.CLONE ) {
                const { coords } = this._toolOptions;
                let tx = this._pointerX - viewport.left;
                let ty = this._pointerY - viewport.top;
                if ( coords ) {
                    tx = ( coords.x - viewport.left ) + ( this._pointerX - this._dragStartEventCoordinates.x );
                    ty = ( coords.y - viewport.top  ) + ( this._pointerY - this._dragStartEventCoordinates.y );
                }
                // when no source coordinate is set, or when applying the clone stamp, we show a cross to mark the origin
                if ( !coords || this._applyPaint ) {
                    renderCross( documentContext, tx, ty, this._radius / this.canvas.zoomFactor );
                }
            }
            documentContext.save();
            documentContext.beginPath();

            if ( drawBrushOutline ) {
                // any other brush mode state shows brush outline
                documentContext.arc( this._pointerX - viewport.left, this._pointerY - viewport.top, this._radius, 0, 2 * Math.PI );
            }
            documentContext.stroke();
            documentContext.restore();
        }
        // render selection outline
        if (( this._isSelectMode || this._hasSelection ) && this.layer.selection ) {
            documentContext.save();
            documentContext.beginPath();
            documentContext.lineWidth = 2 / this.canvas.zoomFactor;

            let { selection }   = this.layer;
            const firstPoint    = selection[ 0 ];
            const localPointerX = this._pointerX - viewport.left; // local to viewport
            const localPointerY = this._pointerY - viewport.top;

            // when in rectangular select mode, the outline will draw from the first coordinate
            // (defined in handlePress()) to the current pointer coordinate
            if ( this._isRectangleSelect && selection.length && !this._selectionClosed ) {
                selection = rectangleToCoordinates(
                    firstPoint.x,
                    firstPoint.y,
                    localPointerX - firstPoint.x + viewport.left,
                    localPointerY - firstPoint.y + viewport.top
                );
            }
            // draw each point in the selection
            selection.forEach(( point, index ) => {
                documentContext[ index === 0 ? "moveTo" : "lineTo" ]( point.x - viewport.left, point.y - viewport.top );
            });

            // for lasso selections, draw line to current cursor position
            if ( !this._isRectangleSelect && !this._selectionClosed ) {
                documentContext.lineTo( localPointerX, localPointerY );
            }
            documentContext.stroke();

            // highlight current cursor position for unclosed selections
            if ( !this._selectionClosed ) {
                documentContext.beginPath();
                documentContext.lineWidth *= 1.5;
                const size = firstPoint && isPointInRange( this._pointerX, this._pointerY, firstPoint.x, firstPoint.y ) ? 15 : 5;
                documentContext.arc( localPointerX, localPointerY, size / this.canvas.zoomFactor, 0, 2 * Math.PI );
                documentContext.stroke();
            }
            documentContext.restore();
        }
    }

    dispose() {
        super.dispose();

        flushLayerCache( this.layer );

        this._bitmap      = null;
        this._bitmapReady = false;
        this._brushCvs    = null;
    }
}
export default LayerSprite;

/* internal non-instance methods */

function storeSelectionHistory( sprite, optPreviousSelection = [] ) {
    const { layer } = sprite;
    const selection = [ ...layer.selection ];
    enqueueState( `selection_${layer.id}`, {
        undo() {
            sprite.setSelection( optPreviousSelection );
        },
        redo() {
            sprite.setSelection( selection );
        }
    });
}
