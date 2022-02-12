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
import Vue from "vue";
import { sprite } from "zcanvas";
import { isInsideTransparentArea } from "@/utils/canvas-util";
import { enqueueState } from "@/factories/history-state-factory";
import { getCanvasInstance, getSpriteForLayer } from "@/factories/sprite-factory";
import { isPointInRange, translatePoints, snapToAngle, rectToCoordinateList } from "@/math/point-math";
import { isSelectionClosed, createSelectionForRectangle } from "@/math/selection-math";
import ToolTypes from "@/definitions/tool-types";
import LayerSprite from "@/rendering/canvas-elements/layer-sprite";
import KeyboardService from "@/services/keyboard-service";

export const MODE_PAN          = 0;
export const MODE_LAYER_SELECT = 1;
export const MODE_SELECTION    = 2;

/**
 * InteractionPane is a top-level canvas-sized Sprite that captures all Canvas
 * interaction events. This is used to:
 *
 * 1. control viewport panning when dragging over the canvas in panMode
 * 2. select the active layer by finding non-transparent pixels at the pointer position
 * 3. create selection outlines that can be used across layers
 */
class InteractionPane extends sprite {
    constructor( zCanvas ) {
        // dimensions will be synced when canvas on setState()
        super({ width : 10, height: 10 });

        this._pointerX = 0;
        this._pointerY = 0;
        this._vpStartX = 0;
        this._vpStartY = 0;

        this._lastRelease = 0;
    }

    setState( enabled, mode, activeTool, activeToolOptions ) {
        this._enabled = enabled;
        this.setDraggable( enabled );

        const zCanvas = getCanvasInstance();

        if ( enabled && !this._parent ) {
            this.vp = zCanvas.getViewport();
            zCanvas.addChild( this );
        } else if ( !enabled ) {
            if ( this._parent ) {
                this._parent.removeChild( this );
            }
            return;
        }
        this.mode = mode;

        this.setBounds(
            0, 0,
            zCanvas.getWidth()  / zCanvas.zoomFactor,
            zCanvas.getHeight() / zCanvas.zoomFactor
        );

        const document = this.getActiveDocument();

        if ( document && mode === MODE_SELECTION ) {
            // create empty selection (or reset to empty selection when switching between
            // rectangle selection tool modes)
            if ( !document.selection ) {
                this.setSelection( [] );
            } else if ( this._lastTool !== activeTool ) {
                this.resetSelection();
            }
            this._hasSelection    = document.selection.length > 0;
            this._selectionClosed = isSelectionClosed( document.selection );
            // we distinguish between the rectangular and lasso selection tool
            this._isRectangleSelect = activeTool === ToolTypes.SELECTION;
            // selection mode has an always active move listener
            this.forceMoveListener();
        } else {
            // unsets move listener
            this.isDragging = false;
        }
        this.toolOptions = activeToolOptions;
        this._lastTool   = activeTool;
    }

    handleActiveTool( tool, remainInteractive ) {
        if ( tool !== ToolTypes.LASSO && this.getActiveDocument()?.selection && !this._selectionClosed ) {
            // reset unclosed selection when switching tools
            this.resetSelection();
        }
        this.setInteractive( remainInteractive );
    }

    stayOnTop() {
        if ( !this._enabled ) {
            return;
        }
        const zCanvas = this._parent;
        zCanvas.removeChild( this );
        zCanvas.addChild( this );
    }

    getActiveDocument() {
        return getCanvasInstance().store.getters.activeDocument;
    }

    getActiveLayer() {
        return getCanvasInstance().store.getters.activeLayer;
    }

    resetSelection() {
        const document = this.getActiveDocument();
        const currentSelection = document.selection || [];
        if ( this.mode === MODE_SELECTION ) {
            this.setSelection( [] );
            if ( isSelectionClosed( currentSelection )) {
                storeSelectionHistory( document, currentSelection, "reset" );
            }
        } else {
            Vue.delete( document, "selection" );
        }
        Vue.set( document, "invertSelection", false );
        this._selectionClosed = false;
        syncSelection();
        this.invalidate();
    }

    setSelection( value, optStoreState = false ) {
        const document = this.getActiveDocument();
        const currentSelection = document.selection || [];
        Vue.set( document, "selection", value );
        if ( optStoreState ) {
            storeSelectionHistory( document, currentSelection );
        }
        this._selectionClosed = value?.length > 1; // TODO: can we determine this from first and last point?
        this.invalidate();
    }

    invertSelection() {
        const document = this.getActiveDocument();
        if ( document.selection?.length > 0 ) {
            const curValue = document.invertSelection;
            const updateFn = value => {
                Vue.set( document, "invertSelection", value );
                syncSelection();
                this.invalidate?.();
            };
            const commit = () => updateFn( !curValue );
            commit();
            enqueueState( "invert", {
                undo() {
                    updateFn( curValue );
                },
                redo: commit
            });
        }
    }

    selectAll( targetLayer = null ) {
        const bounds = targetLayer ? getSpriteForLayer( targetLayer ).getBounds() : this._bounds;
        this.setSelection(
            rectToCoordinateList( bounds.left, bounds.top, bounds.width, bounds.height )
        );
    }

    // cheap way to hook into zCanvas.handleMove()-handler so we can keep following the cursor in tool modes
    forceMoveListener() {
        this.isDragging       = true;
        this._dragStartOffset = { x: this.getX(), y: this.getY() };
        this._dragStartEventCoordinates = { x: this._pointerX, y: this._pointerY };
    }

    /* zCanvas.sprite overrides */

    handlePress( x, y ) {
        this.pointerDown = true;
        switch ( this.mode ) {
            default:
                if ( this.isDragging ) {
                    // implies press has start drag mode
                    this._vpStartX = this.vp.left;
                    this._vpStartY = this.vp.top;
                }
                break;

            case MODE_LAYER_SELECT:
                const sprites = this.canvas.getChildren().filter( sprite => sprite instanceof LayerSprite );
                // loop over all layer sprites in reverse (top of display list to bottom) order
                let i = sprites.length;
                while ( i-- ) {
                    const sprite = sprites[ i ];
                    // if the sprites Bitmap contents are non-transparent at the given coordinate, make it the active layer
                    if ( !isInsideTransparentArea( sprite.getBitmap(), x - sprite.getX(), y - sprite.getY() )) {
                        this.canvas.store.commit( "setActiveLayer", sprite.layer );
                        break;
                    }
                }
                break;

            case MODE_SELECTION:
                if ( !this._selectionClosed ) {
                    const document      = this.getActiveDocument();
                    const { selection } = document;
                    // selection mode, set the click coordinate as the first point in the selection
                    const firstPoint = selection[ 0 ];
                    let storeHistory = false;
                    if ( firstPoint ) {
                        if ( KeyboardService.hasShift() ) {
                            ({ x, y } = snapToAngle( x, y, selection[ selection.length - 1 ] ));
                        }
                        else if ( isPointInRange( x, y, firstPoint.x, firstPoint.y, 5 / this.canvas.zoomFactor )) {
                            // point was in range of start coordinate, snap and close selection
                            this._selectionClosed = true;
                            x = firstPoint.x;
                            y = firstPoint.y;
                            storeHistory = true;
                        }
                    }
                    selection.push({ x, y });
                    if ( storeHistory ) {
                        storeSelectionHistory( document );
                    }
                }
                break;
        }
    }

    handleMove( x, y, { type } ) {
        // store reference to current pointer position (relative to canvas)
        // note that for touch events this is handled in handlePress() instead
        if ( !type.startsWith( "touch" )) {
            this._pointerX = x;
            this._pointerY = y;
        }
        switch ( this.mode ) {
            default:
                return;
            case MODE_SELECTION:
                // when mouse is down and selection is closed, drag the selection
                if ( this._selectionClosed && this.pointerDown ) {
                    const document = this.getActiveDocument();
                    const currentSelection = document.selection;
                    document.selection = translatePoints( currentSelection, x - this._dragStartEventCoordinates.x, y - this._dragStartEventCoordinates.y);
                    this._dragStartEventCoordinates = { x, y }; // update to current position so we can easily move the selection using relative deltas
                    storeSelectionHistory( document, currentSelection, "drag" );
                }
                break;
            case MODE_PAN:
                const distX = this.vp.left - this._vpStartX;
                const distY = this.vp.top  - this._vpStartY;

                const deltaX = (( x - this._dragStartEventCoordinates.x ) * this.canvas.zoomFactor ) - distX;
                const deltaY = (( y - this._dragStartEventCoordinates.y ) * this.canvas.zoomFactor ) - distY;

                this.canvas.panViewport( this._vpStartX - deltaX, this._vpStartY - deltaY, true );
                break;
        }
    }

    handleRelease( x, y ) {
        this.pointerDown = false;
        const now           = Date.now();
        const isDoubleClick = ( now - this._lastRelease ) < 250;
        this._lastRelease   = now;

        if ( this.mode === MODE_SELECTION ) {
            this.forceMoveListener(); // keep the move listener active
            if ( isDoubleClick && this._selectionClosed ) {
                this.resetSelection();
                return;
            }
            const document = this.getActiveDocument();
            if ( this._isRectangleSelect ) {
                if ( document.selection.length > 0 && !this._selectionClosed ) {
                    // when releasing in rectangular select mode, set the selection to
                    // the bounding box of the down press coordinate and this release coordinate
                    const firstPoint = document.selection[ 0 ];
                    const { width, height } = calculateSelectionSize( firstPoint, x, y, this.toolOptions );
                    document.selection = rectToCoordinateList( firstPoint.x, firstPoint.y, width, height );
                    this._selectionClosed = true;
                    storeSelectionHistory( document );
                }
            }
            else if ( isDoubleClick && !this._selectionClosed ) {
                // double click on unclosed lasso tool selections auto-closes the selection
                document.selection.push({ ...document.selection[ 0 ] });
                this._selectionClosed = true;
                storeSelectionHistory( document );
            }
        }
    }

    draw( ctx, viewport ) {
        // render selection outline
        let { selection, invertSelection, width, height } = this.getActiveDocument();
        if ( /*this.mode === MODE_SELECTION && */ selection?.length ) {
            const firstPoint    = selection[ 0 ];
            const localPointerX = this._pointerX - viewport.left; // local to viewport
            const localPointerY = this._pointerY - viewport.top;
            const hasUnclosedSelection = selection.length && !this._selectionClosed;

            // when in rectangular select mode, the outline will draw from the first coordinate
            // (defined in handlePress()) to the current pointer coordinate
            if ( this._isRectangleSelect && hasUnclosedSelection ) {
                const { width, height } = calculateSelectionSize( firstPoint, this._pointerX, this._pointerY, this.toolOptions );
                selection = rectToCoordinateList( firstPoint.x, firstPoint.y, width, height );
            }
            // for unclosed lasso selections, draw line to current cursor position
            let currentPosition = null;
            if ( !this._isRectangleSelect && hasUnclosedSelection ) {
                currentPosition = KeyboardService.hasShift() ?
                    snapToAngle( localPointerX, localPointerY, selection[ selection.length - 1 ], viewport )
                : { x: localPointerX, y: localPointerY };
            }

            // draw each point in the selection
            drawSelection( ctx, this.canvas, viewport, selection, currentPosition );
            if ( invertSelection && !hasUnclosedSelection ) {
                drawSelection( ctx, this.canvas, viewport, createSelectionForRectangle( width, height ), currentPosition );
            }

            // highlight current cursor position for unclosed selections
            ctx.save();
            if ( !this._selectionClosed ) {
                const { zoomFactor } = this.canvas;
                ctx.beginPath();
                ctx.lineWidth   = ctx.lineWidth * ( 2 / zoomFactor );
                ctx.strokeStyle = "#0db0bc";
                const size = firstPoint && isPointInRange( this._pointerX, this._pointerY, firstPoint.x, firstPoint.y, 5 / zoomFactor ) ? 15 : 5;
                ctx.arc( localPointerX, localPointerY, size / zoomFactor, 0, 2 * Math.PI );
                ctx.stroke();
            }
            ctx.restore();
        } else {
            // show bounding box around active layer
            const activeLayer = this.getActiveLayer();
            if ( activeLayer ) {
                ctx.save();
                ctx.lineWidth   = 1 / this.canvas.zoomFactor;
                ctx.strokeStyle = "#0db0bc";
                const { left, top, width, height } = activeLayer;
                const { mirrorY, rotation } = activeLayer.effects;
                const destX = left - viewport.left;
                const destY = top  - viewport.top;
                if ( rotation % 360 !== 0 ) {
                    const tX = destX + ( width  * 0.5 );
                    const tY = destY + ( height * 0.5 );
                    ctx.translate( tX, tY );
                    ctx.rotate( mirrorY ? -rotation : rotation );
                    ctx.translate( -tX, -tY );
                }
                ctx.strokeRect( destX, destY, width, height );
                ctx.restore();
            }
        }

        // DEBUG only
        //ctx.fillStyle = "rgba(255,0,128,.5)";
        //ctx.fillRect( 0, 0, this._bounds.width, this._bounds.height );
    }
}
export default InteractionPane;

/* internal methods */

function drawSelection( ctx, zCanvas, viewport, selection, currentPosition ) {
    ctx.save();
    drawSelectionOutline( ctx, zCanvas, viewport, selection, "#000", currentPosition );
    ctx.restore();

    ctx.save();
    ctx.setLineDash([ 10 / zCanvas.zoomFactor ]);
    drawSelectionOutline( ctx, zCanvas, viewport, selection, "#FFF", currentPosition );
    ctx.restore();
}

function drawSelectionOutline( ctx, zCanvas, viewport, selection, color, currentPosition = null ) {
    ctx.lineWidth = 2 / zCanvas.zoomFactor;
    ctx.beginPath();
    ctx.strokeStyle = color;
    selection.forEach(( point, index ) => {
        ctx[ index === 0 ? "moveTo" : "lineTo" ](
            ( .5 + point.x - viewport.left ) << 0,
            ( .5 + point.y - viewport.top )  << 0
        );
    });
    // for lasso selections, draw line to current cursor position
    if ( currentPosition && currentPosition.x !== 0 && currentPosition.y !== 0 ) {
        ctx.lineTo(( .5 + currentPosition.x ) << 0, ( .5 + currentPosition.y ) << 0 );
    }
    ctx.stroke();
}

function calculateSelectionSize( firstPoint, destX, destY, { lockRatio, xRatio, yRatio }) {
    if ( !lockRatio && !KeyboardService.hasShift() ) {
        return {
            width  : destX - firstPoint.x,
            height : destY - firstPoint.y
        };
    }
    const width = destX - firstPoint.x;
    return {
        width,
        height: width * ( yRatio / xRatio )
    };
}

// synchronizes the selection with the layer Sprite representing the
// currently active layer (e.g. for draw operations)

function syncSelection() {
    const { getters } = getCanvasInstance().store;
    getSpriteForLayer( getters.activeLayer )?.setSelection( getters.activeDocument );
}

function storeSelectionHistory( document, optPreviousSelection = [], optType = "" ) {
    const selection = [ ...document.selection ];
    enqueueState( `selection_${document.name}${optType}`, {
        undo() {
            const cvs = getCanvasInstance();
            if ( cvs ) {
                cvs.interactionPane.setSelection( optPreviousSelection );
                syncSelection();
            }
        },
        redo() {
            getCanvasInstance()?.interactionPane.setSelection( selection );
        }
    });
}
