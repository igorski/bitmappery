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
import { sprite } from "zcanvas";
import { createCanvas, resizeImage, globalToLocal } from "@/utils/canvas-util";
import { LAYER_GRAPHIC, LAYER_MASK, LAYER_TEXT } from "@/definitions/layer-types";
import { isPointInRange, translatePointerRotation, rectangleToCoordinates } from "@/utils/image-math";
import { renderEffectsForLayer } from "@/services/render-service";
import ToolTypes from "@/definitions/tool-types";

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
        requestAnimationFrame(() => {
            renderEffectsForLayer( this.layer );
            this._rafFx = false;
        });
    }

    handleActiveTool( tool, activeLayer ) {
        this.setInteractive( this.layer === activeLayer );
        this.isDragging   = false;
        this._isBrushMode = false;

        if ( !this._interactive ) {
            return;
        }
        this._isDragMode        = tool === ToolTypes.DRAG;
        this._isBrushMode       = false;
        this._isSelectMode      = false;
        this._isRectangleSelect = tool === ToolTypes.SELECTION;
        this._isColorPicker     = false;

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
            case ToolTypes.ERASER:
            case ToolTypes.BRUSH:
                this.forceMoveListener();
                this.setDraggable( true );
                this._isBrushMode = true;
                this._brushType   = tool;
                break;
            case ToolTypes.SELECTION:
            case ToolTypes.LASSO:
                this.forceMoveListener();
                this.setDraggable( true );
                this._isSelectMode = true;
                break;
            case ToolTypes.EYEDROPPER:
                this._isColorPicker = true;
                break;
        }
        this.resetSelection();
    }

    resetSelection() {
        if ( this._isSelectMode ) {
            this.setSelection( [] );
        } else {
            Vue.delete( this.layer, "selection" );
            this.invalidate();
        }
        this._selectionClosed = false;
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

    async resize( width, height ) {
        const ratioX = width  / this._bounds.width;
        const ratioY = height / this._bounds.height;

        if ( this.layer.source ) {
            this.layer.source = await resizeImage(
                this.layer.source, this._bounds.width, this._bounds.height, width, height
            );
        }
        if ( this.layer.mask ) {
            this.layer.mask = await resizeImage(
                this.layer.mask, this._bounds.width, this._bounds.height, width, height
            );
            this.cacheEffects();
        }
        this.setBounds( this.getX() * ratioX, this.getY() * ratioY, width, height );
        this.invalidate();
    }

    // cheap way to hook into zCanvas.handleMove()-handler so we can keep following the cursor in tool modes
    forceMoveListener() {
        this.isDragging       = true;
        this._dragStartOffset = { x: this.getX(), y: this.getY() };
        this._dragStartEventCoordinates = { x: this._pointerX, y: this._pointerY };
    }

    syncedPositioning( x, y ) {
        this._bounds.left = x;
        this._bounds.top  = y;
        this.layer.x = x;
        this.layer.y = y;
        this.invalidate();
    }

    /* the following override zCanvas.sprite */

    handleMove( x, y ) {
        // store reference to current pointer position (relative to canvas)
        this._pointerX = x;
        this._pointerY = y;

        let recacheEffects = false;

        if ( !this._isBrushMode ) {
            // not drawable, perform default behaviour (drag)
            if ( this.actionTarget === "mask" ) {
                this.layer.maskX = this._dragStartOffset.x + (( x - this._bounds.left ) - this._dragStartEventCoordinates.x );
                this.layer.maskY = this._dragStartOffset.y + (( y - this._bounds.top )  - this._dragStartEventCoordinates.y );
                recacheEffects = true;
            } else if ( this._isDragMode /*!this._isSelectMode*/ ) {
                super.handleMove( x, y );
                this.layer.x = this._bounds.left;
                this.layer.y = this._bounds.top;
                return;
            }
        }
        // brush tool active (either draws/erases onto IMAGE_GRAPHIC layer source
        // or on the mask bitmap)
        if ( this._applyBrush ) {
            // translate pointer to translated space, when layer is rotated or mirrored
            const { mirrorX, mirrorY, rotation } = this.layer.effects;
            const rotCenterX = this._bounds.left + this._bounds.width  / 2;
            const rotCenterY = this._bounds.top  + this._bounds.height / 2;

            if ( this.isRotated() ) {
                ({ x, y } = translatePointerRotation( x, y, rotCenterX, rotCenterY, rotation ));
            }
            const drawOnMask = this.isMaskable();
            const isEraser   = this._brushType === ToolTypes.ERASER;
            // get the drawing context
            const ctx = drawOnMask ? this.layer.mask.getContext( "2d" ) : this.layer.source.getContext( "2d" );
            ctx.save();

            if ( isEraser ) {
                ctx.globalCompositeOperation = "destination-out";
            }

            if ( mirrorX ) {
                x -= ctx.canvas.width;
            }
            if ( mirrorY ) {
                y -= ctx.canvas.height;
            }
            // transform destination context in case the current layer is rotated or mirrored
            ctx.scale( mirrorX ? -1 : 1, mirrorY ? -1 : 1 );
            ctx.translate( x, y );
            ctx.rotate( rotation );
            ctx.translate( -x, -y );

            // correct pointer offset w/regards to layer pan position
            x -= this.layer.x;
            y -= this.layer.y;

            // TODO: when rotated, x and y are now in right coordinate space, but not at right point

            // note we draw directly onto the layer bitmaps, making this permanent
            ctx.drawImage( this._brushCvs, x - this._radius, y - this._radius );
            ctx.restore();

            recacheEffects = true;
        }
        if ( recacheEffects ) {
            this.cacheEffects(); // sync mask and source changes with sprite Bitmap
        }
    }

    handlePress( x, y ) {
        if ( this._isColorPicker )
        {
            // color picker mode, get the color below the clicked point
            const local = globalToLocal( this.canvas, x, y );
            const p = this.canvas.getElement().getContext( "2d" ).getImageData(
                local.x - this.canvas._viewport.left,
                local.y - this.canvas._viewport.top,
                1, 1
            ).data;
            this.canvas.store.commit( "setActiveColor", `rgba(${p[0]},${p[1]},${p[2]},${(p[3]/255)})` );
        }
        else if ( this._isBrushMode ) {
            // brush mode, set the application to true (will be applied in handleMove())
            this._applyBrush = true;
        }
        else if ( this._isSelectMode && !this._selectionClosed ) {
            // selection mode, set the click coordinate as the first point in the selection
            const firstPoint = this.layer.selection[ 0 ];
            if ( firstPoint && isPointInRange( x, y, firstPoint.x, firstPoint.y )) {
                this._selectionClosed = true;
                x = firstPoint.x;
                y = firstPoint.y;
            }
            this.layer.selection.push({ x, y });
        }
    }

    handleRelease( x, y ) {
        this._applyBrush = false;
        if ( this._isBrushMode || this._isSelectMode ) {
            this.forceMoveListener(); // keeps the move listener active
            if ( this._isRectangleSelect ) {
                // when releasing in rectangular select mode, set the selection to
                // the bounding box of the down press coordinate and this release coordinate
                const firstPoint = this.layer.selection[ 0 ];
                this.layer.selection = rectangleToCoordinates( firstPoint.x, firstPoint.y, x - firstPoint.x, y - firstPoint.y );
                this._selectionClosed = true;
            }
        }
    }

    draw( documentContext, viewport ) {
        const vp = { ...viewport };
        Object.entries( vp ).forEach(([ key, value ]) => {
            vp[key] = value / this.canvas.zoomFactor; // QQQ to zCanvas.Sprite
        });
        super.draw( documentContext, vp ); // renders bitmap

        // render brush outline at pointer position
        if ( this._isBrushMode ) {
            documentContext.save();
            documentContext.beginPath();
            documentContext.arc( this._pointerX - vp.left, this._pointerY - vp.top, this._radius, 0, 2 * Math.PI );
            documentContext.stroke();
            documentContext.restore();
        }
        // render selection outline
        if ( this._isSelectMode ) {
            documentContext.save();
            documentContext.beginPath();
            documentContext.lineWidth = 2 / this.canvas.zoomFactor;

            let { selection }   = this.layer;
            const firstPoint    = selection[ 0 ];
            const localPointerX = this._pointerX - vp.left; // local to viewport
            const localPointerY = this._pointerY - vp.top;

            // when in rectangular select mode, the outline will draw from the first coordinate
            // (defined in handlePress()) to the current pointer coordinate
            if ( this._isRectangleSelect && selection.length && !this._selectionClosed ) {
                selection = rectangleToCoordinates( firstPoint.x, firstPoint.y, localPointerX - firstPoint.x + vp.left, localPointerY - firstPoint.y + vp.top );
            }
            // draw each point in the selection
            selection.forEach(( point, index ) => {
                documentContext[ index === 0 ? "moveTo" : "lineTo" ]( point.x - vp.left, point.y - vp.top );
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
        this._bitmap   = null;
        this._brushCvs = null;
    }
}
export default LayerSprite;
