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
import { sprite } from "zcanvas";
import type { Point, Size, Viewport } from "zcanvas";
import type { Document, Layer, Shape, Selection } from "@/definitions/document";
import ToolTypes from "@/definitions/tool-types";
import { getRendererForLayer } from "@/factories/renderer-factory";
import { isPointInRange, translatePoints, snapToAngle, rectToCoordinateList } from "@/math/point-math";
import { rotateRectangleToCoordinates, scaleRectangle } from "@/math/rectangle-math";
import { selectByColor } from "@/math/selection-math";
import { fastRound } from "@/math/unit-math";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import type ZoomableCanvas from "@/rendering/actors/zoomable-canvas";
import { getCanvasInstance } from "@/services/canvas-service";
import KeyboardService from "@/services/keyboard-service";
import { invertSelection } from "@/store/actions/selection-invert";
import { applySelection } from "@/store/actions/selection-apply";
import { getPixelRatio, isInsideTransparentArea } from "@/utils/canvas-util";
import { createDocumentSnapshot, createLayerSnapshot } from "@/utils/document-util";
import { getLastShape, syncSelection } from "@/utils/selection-util";
import { rectangleToShape, mergeShapes, isShapeClosed } from "@/utils/shape-util";

export enum InteractionModes {
    MODE_PAN = 0,
    MODE_LAYER_SELECT,
    MODE_SELECTION,
};

const DASH_SIZE  = 10;
const DASH_SPEED = 1; // per frame

const SNAP_MARGIN = 5;

/**
 * InteractionPane is a top-level canvas-sized Sprite that captures all Canvas
 * interaction events. This is used to:
 *
 * 1. control viewport panning when dragging over the canvas in panMode
 * 2. select the active layer by finding non-transparent pixels at the pointer position
 * 3. create selection outlines that can be used across layers
 */
export default class InteractionPane extends sprite {
    public mode: InteractionModes;
    private _toolOptions: any;
    private _pointerDown: boolean;
    private _dashOffset: number;
    private _selectionClosed: boolean;
    private _isAddingToExistingSelection: boolean;
    private _isRectangleSelect: boolean;
    private _activeTool: ToolTypes;
    private _pointer: Point;
    private _vpStart: Point;
    private _lastRelease: number;
    private _enabled: boolean;

    constructor() {
        // dimensions will be synced when canvas on setState()
        super({ width : 10, height: 10 });

        this._pointer = { x: 0, y: 0 };
        this._vpStart = { x: 0, y: 0 };

        this._lastRelease = 0;
        this._dashOffset  = 0;
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
        const zCanvas = this._parent;
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
                applySelection( getCanvasInstance().store, document, currentSelection, "reset" );
            }
        } else {
            document.activeSelection = [];
        }
        document.invertSelection = false;
        this._selectionClosed = false;
        syncSelection( getCanvasInstance().store );
        this.invalidate();
    }

    setSelection( value: Selection, optStoreState = false ): void {
        const document = this.getActiveDocument();
        const currentSelection = document.activeSelection || [];
        document.activeSelection = value;
        if ( optStoreState ) {
            applySelection( getCanvasInstance().store, document, currentSelection );
        }
        this._selectionClosed = isShapeClosed( getLastShape( value ));
        this._dashOffset = 0;
        this.invalidate();
    }

    invertSelection(): void {
        const document = this.getActiveDocument();
        if ( document.activeSelection?.length > 0 ) {
            invertSelection( getCanvasInstance().store, document );
        }
    }

    selectAll( targetLayer: Layer = null ): void {
        if ( targetLayer ) {
            const { scale, rotation, mirrorY } = targetLayer.effects;
            const bounds = scaleRectangle( getRendererForLayer( targetLayer ).getBounds(), scale );
            this.setSelection( [ rotateRectangleToCoordinates( bounds, mirrorY ? -rotation : rotation ) ]);
            return;
        }
        this.setSelection(
            [ rectToCoordinateList( this._bounds.left, this._bounds.top, this._bounds.width, this._bounds.height )]
        );
    }

    // cheap way to hook into zCanvas.handleMove()-handler so we can keep following the cursor in tool modes
    forceMoveListener(): void {
        this.isDragging = true;
        this._dragStartOffset = { x: this.getX(), y: this.getY() };
        this._dragStartEventCoordinates = { ...this._pointer };
    }

    startOutsideSelection( x: number, y: number ): void {
        if ( this.mode !== InteractionModes.MODE_SELECTION ) {
            return;
        }
        this._dragStartEventCoordinates = { x, y };
        this.handlePress( x, y );
    }

    stopOutsideSelection(): void {
        this.mode === InteractionModes.MODE_SELECTION && this.handleRelease( this._pointer.x, this._pointer.y );
    }

    closeSelection(): void {
        this._selectionClosed = true;
        this.canvas.store.commit( "setActiveSelection", [ ...this.getActiveDocument().activeSelection ]);
        applySelection( getCanvasInstance().store, this.getActiveDocument() );
    }

    /* zCanvas.sprite overrides */

    async handlePress( x: number, y: number ): Promise<void> {
        this._pointerDown = true;
        switch ( this.mode ) {
            default:
                if ( this.isDragging ) {
                    // implies press has start drag mode
                    const viewport = this.canvas.getViewport();
                    this._vpStart.x = viewport.left;
                    this._vpStart.y = viewport.top;
                }
                break;

            case InteractionModes.MODE_LAYER_SELECT:
                const layerRenderers: LayerRenderer[] = this.canvas.getChildren().filter(( s: sprite ) => s instanceof LayerRenderer );
                // loop over all layer renderers in reverse (top of display list to bottom) order
                let i = layerRenderers.length;
                while ( i-- ) {
                    const renderer = layerRenderers[ i ];
                    // if the renderers Bitmap contents are non-transparent at the given coordinate, make it the active layer
                    if ( !isInsideTransparentArea( renderer.getBitmap() as HTMLCanvasElement, x - renderer.getX(), y - renderer.getY() )) {
                        this.canvas.store.commit( "setActiveLayer", renderer.layer );
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
                    const pixelRatio = getPixelRatio();
                    const selectedShape: Shape = selectByColor(
                        cvs, fastRound( x * pixelRatio ), fastRound( y * pixelRatio ), this._toolOptions.threshold
                    ).map(({ x, y }) => ({
                        x: fastRound( x / pixelRatio ),
                        y: fastRound( y / pixelRatio ),
                    }));

                    if ( isShiftKeyDown ) {
                        // TODO check whether mergable first in above condition
                        activeSelection = [ mergeShapes( selectedShape, getLastShape( activeSelection ) ?? [] ) ];
                    } else {
                        activeSelection = [ ...activeSelection, selectedShape ];
                    }
                    this.canvas.store.commit( "setActiveSelection", activeSelection );
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
                        this.canvas.store.commit( "setActiveSelection", [ selectionShape ]);
                    }
                    // selection mode, set the click coordinate as the first point in the selection
                    const firstPoint = selectionShape[ 0 ];
                    if ( firstPoint ) {
                        if ( isShiftKeyDown ) {
                            ({ x, y } = snapToAngle( x, y, selectionShape.at( -1 ) ));
                        }
                        else if ( isPointInRange( x, y, firstPoint.x, firstPoint.y, SNAP_MARGIN / this.canvas.zoomFactor )) {
                            // point was in range of start coordinate, snap and close selection
                            x = firstPoint.x;
                            y = firstPoint.y;
                            completeSelection = true;
                        }
                    }
                    selectionShape.push({ x, y });
                }
                if ( completeSelection ) {
                    this.closeSelection();
                }
                break;
        }
    }

    handleMove( x: number, y: number, { type }: Event ): void {
        // store reference to current pointer position (relative to canvas)
        // note that for touch events this is handled in handlePress() instead
        if ( !type.startsWith( "touch" )) {
            this._pointer.x = x;
            this._pointer.y = y;
        }
        switch ( this.mode ) {
            default:
                return;
            case InteractionModes.MODE_SELECTION:
                if ( this._pointerDown ) {
                    const document = this.getActiveDocument();
                    const currentSelection = document.activeSelection;

                    if ( this._selectionClosed ) {
                        // when mouse is down and selection is closed, drag the selection
                        document.activeSelection = currentSelection.map( s => translatePoints( s, x - this._dragStartEventCoordinates.x, y - this._dragStartEventCoordinates.y ));
                        this._dragStartEventCoordinates = { x, y }; // update to current position so we can easily move the selection using relative deltas
                        applySelection( getCanvasInstance().store, document, currentSelection, "drag" );
                    } else if ( !this._isRectangleSelect ) {
                        // free-form drawing
                        let closeSelection = false;
                        let selectionShape: Shape = getLastShape( currentSelection );
                        const firstPoint = selectionShape[ 0 ];
                        if ( firstPoint && selectionShape.length > ( SNAP_MARGIN * 4 ) && isPointInRange( x, y, firstPoint.x, firstPoint.y, SNAP_MARGIN / this.canvas.zoomFactor )) {
                            // point was in range of start coordinate, snap and close selection
                            x = firstPoint.x;
                            y = firstPoint.y;
                            closeSelection = true;
                        }
                        selectionShape.push({ x, y });
                        if ( closeSelection ) {
                            this.closeSelection();
                            this.handleRelease( x, y );
                        }
                    }
                }
                break;
            case InteractionModes.MODE_PAN:
                const viewport = this.canvas.getViewport();

                const distX = viewport.left - this._vpStart.x;
                const distY = viewport.top  - this._vpStart.y;

                const deltaX = (( x - this._dragStartEventCoordinates.x ) * this.canvas.zoomFactor ) - distX;
                const deltaY = (( y - this._dragStartEventCoordinates.y ) * this.canvas.zoomFactor ) - distY;

                this.canvas.panViewport( this._vpStart.x - deltaX, this._vpStart.y - deltaY, true );
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
                    const { width, height } = calculateSelectionSize( firstPoint, {
                        x: Math.max( 0, Math.min( document.width, x )),
                        y: Math.max( 0, Math.min( document.height, y ))
                    }, this._toolOptions );
                    document.activeSelection[ document.activeSelection.length - 1 ] = rectToCoordinateList( firstPoint.x, firstPoint.y, width, height );
                    this.closeSelection();
                }
            }
            else if ( isDoubleClick && !this._selectionClosed ) {
                // double click on unclosed lasso tool selections auto-closes the selection
                document.activeSelection.at( -1 ).push({ ...document.activeSelection.at( -1 )[ 0 ] });
                this.closeSelection();
            }
        }
    }

    update( _now: DOMHighResTimeStamp, framesSinceLastUpdate: number ): void {
        if ( this._selectionClosed && this.getActiveDocument().activeSelection?.length ) {
            this._dashOffset -= (( DASH_SPEED * this.canvas.zoomFactor ) * framesSinceLastUpdate ); // advance the selection outline animation
        }
    }

    draw( ctx: CanvasRenderingContext2D, viewport: Viewport ): void {
        const document = this.getActiveDocument();
        if ( !document ) {
            return; // pane was active prior to Document closing
        }
        let { activeSelection, invertSelection, width, height } = document;
        // render selection outline
        if ( /*this.mode === InteractionModes.MODE_SELECTION && */ activeSelection?.length > 0 ) {
            for ( let shape of activeSelection ) {
                const connectToPointer = shape === activeSelection.at( -1 );
                const firstPoint    = shape[ 0 ];
                const localPointerX = this._pointer.x - viewport.left; // local to viewport
                const localPointerY = this._pointer.y - viewport.top;
                const hasUnclosedSelection = shape.length && !this._selectionClosed;

                // when in rectangular select mode, the outline will draw from the first coordinate
                // (defined in handlePress()) to the current pointer coordinate
                if ( connectToPointer && this._isRectangleSelect && hasUnclosedSelection ) {
                    const { width, height } = calculateSelectionSize( firstPoint, this._pointer, this._toolOptions );
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
                drawSelectionShape( ctx, this.canvas, viewport, shape, currentPosition, this._dashOffset );
                if ( invertSelection && !hasUnclosedSelection ) {
                    drawSelectionShape( ctx, this.canvas, viewport, rectangleToShape( width, height ), currentPosition, this._dashOffset );
                }

                // highlight current cursor position for unclosed selections
                ctx.save();
                if ( !this._selectionClosed ) {
                    const { zoomFactor } = this.canvas;
                    ctx.beginPath();
                    ctx.lineWidth   = 2 / zoomFactor;
                    ctx.strokeStyle = "#0db0bc";
                    const size = firstPoint && isPointInRange( this._pointer.x, this._pointer.y, firstPoint.x, firstPoint.y, SNAP_MARGIN / zoomFactor ) ? 15 : 5;
                    ctx.arc( localPointerX, localPointerY, size / zoomFactor, 0, 2 * Math.PI );
                    ctx.stroke();
                }
                ctx.restore();
            }
        } else {
            // show bounding box around active layer
            const activeLayer = this.getActiveLayer();
            if ( activeLayer ) {
                ctx.save();
                ctx.lineWidth   = 1 / this.canvas.zoomFactor;
                ctx.strokeStyle = "#0db0bc";
                const { mirrorY, scale, rotation } = activeLayer.effects;
                const { left, top, width, height } = ( scale !== 1 ) ? scaleRectangle( activeLayer, scale ) : activeLayer;
                const destX = left - viewport.left;
                const destY = top  - viewport.top;
                if ( rotation % 360 !== 0 ) {
                    const tX = destX + ( width  * 0.5 );
                    const tY = destY + ( height * 0.5 );
                    ctx.translate( tX, tY );
                    ctx.rotate( mirrorY ? -rotation : rotation );
                    ctx.translate( -tX, -tY );
                }
                ctx.strokeRect( fastRound( destX ), fastRound( destY ), fastRound( width ), fastRound( height ));
                ctx.restore();
            }
        }
    }
}

/* internal methods */

function drawSelectionShape( ctx: CanvasRenderingContext2D, zoomableCanvas: ZoomableCanvas, viewport: Viewport,
                             shape: Shape, currentPosition?: Point, dashOffset = 0 ): void {
    const { zoomFactor } = zoomableCanvas;
    ctx.save();
    drawShapeOutline( ctx, zoomableCanvas, viewport, shape, "#000", currentPosition );
    ctx.restore();

    ctx.save();
    ctx.setLineDash([ DASH_SIZE / zoomFactor ]);
    ctx.lineDashOffset = ( DASH_SIZE + dashOffset ) / zoomFactor;   
    drawShapeOutline( ctx, zoomableCanvas, viewport, shape, "#FFF", currentPosition );
    ctx.restore();
}

function drawShapeOutline( ctx: CanvasRenderingContext2D, zCanvas: ZoomableCanvas, viewport: Viewport,
                           shape: Shape, color: string, currentPosition?: Point ): void {
    ctx.lineWidth = 2 / zCanvas.zoomFactor;
    ctx.beginPath();
    ctx.strokeStyle = color;
    shape.forEach(( point, index ) => {
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

function calculateSelectionSize( firstPoint: Point, destination: Point,
    { lockRatio, xRatio, yRatio }: { lockRatio: boolean, xRatio: number, yRatio: number }): Size {
    if ( !lockRatio && !KeyboardService.hasShift() ) {
        return {
            width  : destination.x - firstPoint.x,
            height : destination.y - firstPoint.y
        };
    }
    const width = destination.x - firstPoint.x;
    return {
        width,
        height: width * ( yRatio / xRatio )
    };
}
