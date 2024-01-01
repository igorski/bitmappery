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
import Vue from "vue";
import { Sprite } from "zcanvas";
import type { Point, Size, Viewport, IRenderer } from "zcanvas";
import type { Document, Layer, Shape, Selection } from "@/definitions/document";
import ToolTypes from "@/definitions/tool-types";
import { enqueueState } from "@/factories/history-state-factory";
import { getCanvasInstance, getSpriteForLayer } from "@/factories/sprite-factory";
import { isPointInRange, translatePoints, snapToAngle, rectToCoordinateList, } from "@/math/point-math";
import { scaleRectangle } from "@/math/rectangle-math";
import { selectByColor } from "@/math/selection-math";
import { fastRound } from "@/math/unit-math";
import LayerSprite from "@/rendering/canvas-elements/layer-sprite";
import type ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";
import KeyboardService from "@/services/keyboard-service";
import { isInsideTransparentArea } from "@/utils/canvas-util";
import { createDocumentSnapshot, createLayerSnapshot } from "@/utils/document-util";
import { getLastShape } from "@/utils/selection-util";
import { rectangleToShape, mergeShapes, isShapeClosed } from "@/utils/shape-util";

export enum InteractionModes {
    MODE_PAN = 0,
    MODE_LAYER_SELECT,
    MODE_SELECTION,
};

/**
 * InteractionPane is a top-level canvas-sized Sprite that captures all Canvas
 * interaction events. This is used to:
 *
 * 1. control viewport panning when dragging over the canvas in panMode
 * 2. select the active layer by finding non-transparent pixels at the pointer position
 * 3. create selection outlines that can be used across layers
 */
class InteractionPane extends Sprite {
    public mode: InteractionModes;
    private _toolOptions: any;
    private _pointerDown: boolean;
    private _hasSelection: boolean;
    private _selectionClosed: boolean;
    private _isAddingToExistingSelection: boolean;
    private _isRectangleSelect: boolean;
    private _activeTool: ToolTypes;
    private _pointerX: number;
    private _pointerY: number;
    private _vpStartX: number;
    private _vpStartY: number;
    private _lastRelease: number;
    private _enabled: boolean;

    constructor() {
        // dimensions will be synced when canvas on setState()
        super({ width : 10, height: 10 });

        this._pointerX = 0;
        this._pointerY = 0;
        this._vpStartX = 0;
        this._vpStartY = 0;

        this._lastRelease = 0;
    }

    setState( enabled: boolean, mode: InteractionModes, activeTool: ToolTypes, active_toolOptions: any ): void {
        this._enabled = enabled;
        this.setDraggable( enabled );

        const zCanvas = getCanvasInstance();

        if ( enabled && !this._parent ) {
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

        if ( document && mode === InteractionModes.MODE_SELECTION ) {
            // create empty selection (or reset to empty selection when switching between
            // rectangle selection tool modes)
            if ( !document.activeSelection ) {
                this.setSelection( [] );
            } else if ( this._activeTool !== activeTool ) {
                this.resetSelection();
            }
            this._hasSelection = document.activeSelection.length > 0;
            this._selectionClosed = isShapeClosed( getLastShape( document.activeSelection ));
            // we distinguish between the rectangular and lasso selection tool
            this._isRectangleSelect = activeTool === ToolTypes.SELECTION;
            // selection mode has an always active move listener
            this.forceMoveListener();
        } else {
            // unsets move listener
            this.isDragging = false;
        }
        this._toolOptions = active_toolOptions;
        this._activeTool = activeTool;
    }

    handleActiveTool( tool: ToolTypes, remainInteractive: boolean ): void {
        if ( tool !== ToolTypes.LASSO && this.getActiveDocument()?.activeSelection && !this._selectionClosed ) {
            // reset unclosed selection when switching tools
            this.resetSelection();
        }
        this.setInteractive( remainInteractive );
    }

    stayOnTop(): void {
        if ( !this._enabled ) {
            return;
        }
        const zCanvas = this.getCanvas();
        zCanvas.removeChild( this );
        zCanvas.addChild( this );
    }

    getActiveDocument(): Document {
        return getCanvasInstance().store.getters.activeDocument;
    }

    getActiveLayer(): Layer {
        return getCanvasInstance().store.getters.activeLayer;
    }

    resetSelection(): void {
        const document = this.getActiveDocument();
        const currentSelection = document.activeSelection || [];
        if ( this.mode === InteractionModes.MODE_SELECTION ) {
            this.setSelection( [] );
            if ( isShapeClosed( getLastShape( currentSelection ))) {
                storeSelectionHistory( document, currentSelection, "reset" );
            }
        } else {
            Vue.set( document, "activeSelection", [] );
        }
        Vue.set( document, "invertSelection", false );
        this._selectionClosed = false;
        syncSelection();
        this.invalidate();
    }

    setSelection( value: Selection, optStoreState = false ): void {
        const document = this.getActiveDocument();
        const currentSelection = document.activeSelection || [];
        Vue.set( document, "activeSelection", value );
        if ( optStoreState ) {
            storeSelectionHistory( document, currentSelection );
        }
        this._selectionClosed = isShapeClosed( getLastShape( value ));
        this.invalidate();
    }

    invertSelection(): void {
        const document = this.getActiveDocument();
        if ( document.activeSelection?.length > 0 ) {
            const curValue = document.invertSelection;
            const updateFn = ( value: boolean ) => {
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

    selectAll( targetLayer: Layer = null ): void {
        const bounds = targetLayer ? getSpriteForLayer( targetLayer ).getBounds() : this._bounds;
        this.setSelection(
            [ rectToCoordinateList( bounds.left, bounds.top, bounds.width, bounds.height )]
        );
    }

    // cheap way to hook into zCanvas.handleMove()-handler so we can keep following the cursor in tool modes
    forceMoveListener(): void {
        this.isDragging = true;
        this._dro = { x: this.getX(), y: this.getY() };
        this._drc = { x: this._pointerX, y: this._pointerY };
    }

    startOutsideSelection( x: number, y: number ): void {
        if ( this.mode !== InteractionModes.MODE_SELECTION ) {
            return;
        }
        this._drc = { x, y };
        this.handlePress( x, y );
    }

    stopOutsideSelection(): void {
        this.mode === InteractionModes.MODE_SELECTION && this.handleRelease( this._pointerX, this._pointerY );
    }

    closeSelection(): void {
        this._selectionClosed = true;
        // triggers reactivity (as activeSelection is a nested array)
        this.getCanvas().store.commit( "setActiveSelection", [ ...this.getActiveDocument().activeSelection ]);
    }

    /* zCanvas.sprite overrides */

    async handlePress( x: number, y: number ): Promise<void> {
        this._pointerDown = true;
        switch ( this.mode ) {
            default:
                if ( this.isDragging ) {
                    // implies press has start drag mode
                    const viewport = this.getCanvas().getViewport();
                    this._vpStartX = viewport.left;
                    this._vpStartY = viewport.top;
                }
                break;

            case InteractionModes.MODE_LAYER_SELECT:
                const sprites: LayerSprite[] = this.getCanvas().getChildren().filter(( sprite: Sprite ) => sprite instanceof LayerSprite ) as LayerSprite[];
                // loop over all layer sprites in reverse (top of display list to bottom) order
                let i = sprites.length;
                while ( i-- ) {
                    const sprite = sprites[ i ];
                    // if the sprites Bitmap contents are non-transparent at the given coordinate, make it the active layer
                    const bitmap = await sprite.getBitmap();
                    if ( !isInsideTransparentArea( bitmap, x - sprite.getX(), y - sprite.getY() )) {
                        this.getCanvas().store.commit( "setActiveLayer", sprite.layer );
                        break;
                    }
                }
                break;

            case InteractionModes.MODE_SELECTION:
                const isShiftKeyDown = KeyboardService.hasShift();
                let { activeSelection } = this.getActiveDocument();
                let completeSelection = false;

                if ( this._activeTool === ToolTypes.WAND ) {
                    const cvs = await ( this._toolOptions.sampleMerged ? createDocumentSnapshot( this.getActiveDocument() ) : createLayerSnapshot( this.getActiveLayer() ));
                    const selectedShape: Shape = selectByColor( cvs, x, y, this._toolOptions.threshold );
                    if ( isShiftKeyDown ) {
                        // TODO check if mergable first in above condition
                        activeSelection = [ mergeShapes( selectedShape, getLastShape( activeSelection ) ?? [] ) ];
                    } else {
                        activeSelection = [ ...activeSelection, selectedShape ];
                    }
                    this.getCanvas().store.commit( "setActiveSelection", activeSelection );
                    completeSelection = true;
                }
                else if ( !this._selectionClosed || isShiftKeyDown ) {
                    this._isAddingToExistingSelection = activeSelection.length > 0 && isShiftKeyDown && this._selectionClosed;
                    if ( this._isAddingToExistingSelection ) {
                        activeSelection.push( [] );
                        this._selectionClosed = false;
                    }
                    let selectionShape: Shape = getLastShape( activeSelection );
                    if ( !selectionShape ) {
                        selectionShape = [];
                        this.getCanvas().store.commit( "setActiveSelection", [ selectionShape ]);
                    }
                    // selection mode, set the click coordinate as the first point in the selection
                    const firstPoint = selectionShape[ 0 ];
                    if ( firstPoint ) {
                        if ( isShiftKeyDown ) {
                            ({ x, y } = snapToAngle( x, y, selectionShape.at( -1 ) ));
                        }
                        else if ( isPointInRange( x, y, firstPoint.x, firstPoint.y, 5 / this.getCanvas().zoomFactor )) {
                            // point was in range of start coordinate, snap and close selection
                            x = firstPoint.x;
                            y = firstPoint.y;
                            completeSelection = true;
                        }
                    }
                    selectionShape.push({ x, y });
                }
                if ( completeSelection ) {
                    storeSelectionHistory( this.getActiveDocument() );
                    this._selectionClosed = true;
                }
                break;
        }
    }

    handleMove( x: number, y: number, { type }: Event ): void {
        // store reference to current pointer position (relative to canvas)
        // note that for touch events this is handled in handlePress() instead
        if ( !type.startsWith( "touch" )) {
            this._pointerX = x;
            this._pointerY = y;
        }
        switch ( this.mode ) {
            default:
                return;
            case InteractionModes.MODE_SELECTION:
                // when mouse is down and selection is closed, drag the selection
                if ( this._selectionClosed && this._pointerDown ) {
                    const document = this.getActiveDocument();
                    const currentSelection = document.activeSelection;
                    document.activeSelection = currentSelection.map( s => translatePoints( s, x - this._drc.x, y - this._drc.y ));
                    this._drc = { x, y }; // update to current position so we can easily move the selection using relative deltas
                    storeSelectionHistory( document, currentSelection, "drag" );
                }
                break;
            case InteractionModes.MODE_PAN:
                const viewport = this.getCanvas().getViewport();

                const distX = viewport.left - this._vpStartX;
                const distY = viewport.top  - this._vpStartY;

                const deltaX = (( x - this._drc.x ) * this.getCanvas().zoomFactor ) - distX;
                const deltaY = (( y - this._drc.y ) * this.getCanvas().zoomFactor ) - distY;

                this.getCanvas().panViewport( this._vpStartX - deltaX, this._vpStartY - deltaY, true );
                break;
        }
    }

    handleRelease( x: number, y: number ): void {
        this._pointerDown = false;
        const now           = Date.now();
        const isDoubleClick = ( now - this._lastRelease ) < 250;
        this._lastRelease   = now;

        if ( this.mode === InteractionModes.MODE_SELECTION ) {
            this._isAddingToExistingSelection = false;
            this.forceMoveListener(); // keep the move listener active
            if ( isDoubleClick && this._selectionClosed ) {
                this.resetSelection();
                return;
            }
            const document = this.getActiveDocument();
            if ( this._isRectangleSelect ) {
                if ( !this._selectionClosed ) {
                    // when releasing in rectangular select mode, set the selection to
                    // the bounding box of the down press coordinate and this release coordinate
                    const firstPoint = getLastShape( document.activeSelection )[ 0 ];
                    const { width, height } = calculateSelectionSize( firstPoint, Math.max( 0, Math.min( document.width, x )), Math.max( 0, Math.min( document.height, y )), this._toolOptions );
                    document.activeSelection[ document.activeSelection.length - 1 ] = rectToCoordinateList( firstPoint.x, firstPoint.y, width, height );
                    this.closeSelection();
                    storeSelectionHistory( document );
                }
            }
            else if ( isDoubleClick && !this._selectionClosed ) {
                // double click on unclosed lasso tool selections auto-closes the selection
                document.activeSelection.at( -1 ).push({ ...document.activeSelection.at( -1 )[ 0 ] });
                this.closeSelection();
                storeSelectionHistory( document );
            }
        }
    }

    override draw( renderer: IRenderer, viewport: Viewport ): void {
        // render selection outline
        let { invertSelection, width, height } = this.getActiveDocument();
        const { activeSelection } = this.getActiveDocument();
        if ( /*this.mode === InteractionModes.MODE_SELECTION && */ activeSelection?.length > 0 ) {
            for ( let shape of activeSelection ) {
                const connectToPointer = shape === activeSelection.at( -1 );
                const firstPoint    = shape[ 0 ];
                const localPointerX = this._pointerX - viewport.left; // local to viewport
                const localPointerY = this._pointerY - viewport.top;
                const hasUnclosedSelection = shape.length && !this._selectionClosed;

                // when in rectangular select mode, the outline will draw from the first coordinate
                // (defined in handlePress()) to the current pointer coordinate
                if ( connectToPointer && this._isRectangleSelect && hasUnclosedSelection ) {
                    const { width, height } = calculateSelectionSize( firstPoint, this._pointerX, this._pointerY, this._toolOptions );
                    shape = rectToCoordinateList( firstPoint.x, firstPoint.y, width, height );
                }
                // for unclosed lasso selections, draw line to current cursor position
                let currentPosition: Point | undefined;
                if ( connectToPointer && !this._isRectangleSelect && hasUnclosedSelection ) {
                    currentPosition = KeyboardService.hasShift() ?
                        snapToAngle( localPointerX, localPointerY, shape.at( -1 ), viewport )
                    : { x: localPointerX, y: localPointerY };
                }

                // draw each point in the selection
                drawSelectionShape( renderer, this.getCanvas(), viewport, shape, currentPosition );
                if ( invertSelection && !hasUnclosedSelection ) {
                    drawSelectionShape( renderer, this.getCanvas(), viewport, rectangleToShape( width, height ), currentPosition );
                }

                // highlight current cursor position for unclosed selections
                if ( !this._selectionClosed ) {
                    const { zoomFactor } = this.getCanvas();
                    const size = firstPoint && isPointInRange( this._pointerX, this._pointerY, firstPoint.x, firstPoint.y, 5 / zoomFactor ) ? 15 : 5;
                    
                    renderer.drawCircle( localPointerX, localPointerY, size / zoomFactor, "transparent", {
                        color: "#0db0bc",
                        size: 2 / zoomFactor,
                    });
                }
            }
        } else {
            // show bounding box around active layer
            const activeLayer = this.getActiveLayer();
            if ( activeLayer ) {
                const { mirrorY, scale, rotation } = activeLayer.effects;
                const { left, top, width, height } = ( scale !== 1 ) ? scaleRectangle( activeLayer, scale ) : activeLayer;
                const destX = left - viewport.left;
                const destY = top  - viewport.top;
                /*
                ctx.save();
                ctx.lineWidth   = 1 / this.getCanvas().zoomFactor;
                ctx.strokeStyle = "#0db0bc";
                const { mirrorY, scale, rotation } = activeLayer.effects;
                if ( rotation % 360 !== 0 ) {
                    const tX = destX + ( width  * 0.5 );
                    const tY = destY + ( height * 0.5 );
                    ctx.translate( tX, tY );
                    ctx.rotate( mirrorY ? -rotation : rotation );
                    ctx.translate( -tX, -tY );
                }*/
                renderer.drawRect(
                    fastRound( destX ), fastRound( destY ), fastRound( width ), fastRound( height ),
                    undefined, { size: 1 / this.getCanvas().zoomFactor, color: "#0db0bc" },
                    { rotation: mirrorY ? -rotation  : rotation, scale, alpha: 1 }
                );
                //ctx.restore();
            }
        }
        // DEBUG only
        //renderer.fillRect( 0, 0, this._bounds.width, this._bounds.height, "rgba(255,0,128,.5)" );
    }

    protected getCanvas(): ZoomableCanvas {
        return ( this.canvas || this._parent ) as unknown as ZoomableCanvas;
    }
}
export default InteractionPane;

/* internal methods */

function drawSelectionShape( renderer: IRenderer, zCanvas: ZoomableCanvas, viewport: Viewport,
                             shape: Shape, currentPosition?: Point ): void {
    drawShapeOutline( renderer, zCanvas, viewport, shape, "#000", currentPosition );
    drawShapeOutline( renderer, zCanvas, viewport, shape, "#FFF", currentPosition, [ 10 / zCanvas.zoomFactor ] );
}

function drawShapeOutline( renderer: IRenderer, zCanvas: ZoomableCanvas, viewport: Viewport,
                           shape: Shape, color: string, currentPosition?: Point, dash?: number[] ): void {
    // @todo can we cache this?
    const points = shape.reduce(( acc, point ) => {
        acc.push({
            x: ( .5 + point.x - viewport.left ) << 0,
            y: ( .5 + point.y - viewport.top )  << 0
        });
        return acc;
    }, [] as Point[]);

    // for lasso selections, draw line to current cursor position
    if ( currentPosition && currentPosition.x !== 0 && currentPosition.y !== 0 ) {
        points.push({ x: ( .5 + currentPosition.x ) << 0, y: ( .5 + currentPosition.y ) << 0 });
    }
    renderer.drawPath(
        points, undefined, { size: 2 / zCanvas.zoomFactor, color, dash }
    );
}

function calculateSelectionSize( firstPoint: Point, destX: number, destY: number,
    { lockRatio, xRatio, yRatio }: { lockRatio: boolean, xRatio: number, yRatio: number }): Size {
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

function syncSelection(): void {
    const { getters } = getCanvasInstance().store;
    getSpriteForLayer( getters.activeLayer )?.setSelection( getters.activeDocument );
}

function storeSelectionHistory( document: Document, optPreviousSelection: Selection = [], optType = "" ): void {
    const selection = [ ...document.activeSelection ];
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
