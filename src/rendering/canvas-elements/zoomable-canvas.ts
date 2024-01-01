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
import { Canvas } from "zcanvas";
import type { Rectangle, Sprite, Viewport, CanvasProps } from "zcanvas";
import type { Document } from "@/definitions/document";
import InteractionPane from "@/rendering/canvas-elements/interaction-pane";
import type LayerSprite from "@/rendering/canvas-elements/layer-sprite";
import { fastRound } from "@/math/unit-math";
import { renderState } from "@/services/render-service";
import type { BitMapperyState } from "@/store";

class ZoomableCanvas extends Canvas {
    public store: Store<BitMapperyState>; // Vuex root store reference
    public rescaleFn: () => void; // rescale handler used to match parent component with zCanvas rescales
    public refreshFn: () => void; // refresh handler used to force rebuild of all Layer renderers
    public documentScale: number;
    public zoomFactor: number;
    public interactionPane: InteractionPane;
    public guides: Rectangle[];
    public locked: boolean;
    public draggingSprite: LayerSprite | null; // reference to Sprite that is being dragged (see LayerSprite)

    private _interactionBlocked: boolean;

    constructor( opts: CanvasProps, store: Store<BitMapperyState>, rescaleFn: () => void, refreshFn: () => void ) {
        super({
            ...opts,
            stretchToFit: false,
            autoSize: false,
            optimize: "none" // @todo Worker support unstable as of none
        });
        this.store = store;
        this.rescaleFn = rescaleFn;
        this.refreshFn = refreshFn;

        this.documentScale = 1;
        this.setZoomFactor( 1 );
        this.interactionPane = new InteractionPane();
  
        this.draggingSprite = null;
    }

    setDocumentScale( targetWidth: number, targetHeight: number, scale: number, zoom: number, activeDocument: Document = null ): void {
        const { left, top, width, height } = this.getViewport()!;

        let scrollWidth  = this._width  - width;
        let scrollHeight = this._height - height;

        // cache the current scroll offset so we can zoom from the current offset
        // note that by default we zoom from the center (when document was unscrolled)
        const ratioX = ( left / scrollWidth )  || .5;
        const ratioY = ( top  / scrollHeight ) || .5;

        this.setDimensions( fastRound( targetWidth ), fastRound( targetHeight ), true, true );
        this.setZoomFactor( scale * zoom ); // eventually replace with zCanvas.setZoom()

        // update scroll widths after scaling operation

        scrollWidth  = this._width  - width;
        scrollHeight = this._height - height;

        // maintain relative scroll offset after rescale
        this.panViewport(
            fastRound( scrollWidth  * ratioX ),
            fastRound( scrollHeight * ratioY ), true
        );

        if ( activeDocument ) {
            this.documentScale = activeDocument.width / this._width; // the scale of the Document relative to this on-screen canvas
        }
    }

    getActiveDocument(): Document {
        return this.store.getters.activeDocument;
    }

    setInteractive( isInteractive: boolean ): void {
        this._interactionBlocked = !isInteractive;
    }

    setZoomFactor( scale: number ): void {
        this.zoomFactor = scale;

        // This zoom factor logic should move into the zCanvas
        // library where updateCanvasSize() takes this additional factor into account

        this.getRenderer().scale( scale );
        this.invalidate();
    }

    setLock( locked: boolean ): void {
        this.locked = locked; // freezes current Canvas contents for a single render cycle
    }

    setGuides( guides: Rectangle[] ): void {
        this.guides = guides;
    }

    requestDeferredRender( force = this._animate ): void {
        // keeps render loop going when Canvas is animatable
        if ( !this._disposed && force && !this._renderPending ) {
            this._renderPending = true;
            this._renderId = window.requestAnimationFrame( this._renHdlr as FrameRequestCallback );
        }
    }

    /* zCanvas.Canvas overrides */

    // see QQQ comments to see what the difference is. Ideally these changes
    // should eventually be propagated to the zCanvas library.

    override render( now: DOMHighResTimeStamp = 0 ): void {
        const delta = now - this._lastRender;

        this._renderPending = false;
        this._lastRender    = now - ( delta % this._rIval );

        // QQQ to prevent flickering between frames in which states update, we
        // can lock the canvas to keep the existing contents on screen
        if ( renderState.pending > 0 || this.locked ) {
            // console.info("no render. pending:" + renderState.pending + " lock:" + this.locked);
            this.locked = false;
            return this.requestDeferredRender( true );
        }

        // in case a resize was requested execute it now as we will
        // immediately draw new contents onto the screen

        if ( this._qSize ) {
            this.updateCanvasSize();
        }

        const renderer = this.getRenderer();
       
        // QQQ zoomFactor must be taken into account

        const { zoomFactor } = this;

        const width  = fastRound( this._width  / zoomFactor );
        const height = fastRound( this._height / zoomFactor );

        // @todo cache this ?
        const viewport = { ...this._vp } as Viewport;
        Object.entries( viewport ).forEach(([ key, value ]): void => {
            // @ts-expect-error explicit any on key
            viewport[ key ] = ( value as number ) / zoomFactor;
        });

        // E.O. QQQ

        // clear previous canvas contents either by flooding it
        // with the optional background colour, or by clearing all pixel content

        if ( this._bgColor ) {
            renderer.drawRect( 0, 0, width, height, this._bgColor );
        } else {
            renderer.clearRect( 0, 0, width, height );
        }

        const framesSinceLastUpdate = 1; // may not be true, but not an issue in BitMappery
        const useExternalUpdateHandler = typeof this._upHdlr === "function";

        if ( useExternalUpdateHandler ) {
            this._upHdlr!( now, framesSinceLastUpdate );
        }

        // draw the children onto the canvas

        let theSprite: Sprite | undefined = this._children[ 0 ];

        while ( theSprite ) {
            if ( !useExternalUpdateHandler ) {
                theSprite.update( now, framesSinceLastUpdate );
            }
            theSprite.draw( renderer, viewport );
            theSprite = theSprite.next;
        }
        this.requestDeferredRender();
    }

    override handleInteraction( event: MouseEvent | TouchEvent ): void {
        if ( this._interactionBlocked ) {
            return;
        }
        const numChildren = this._children.length;
        const viewport    = this.getViewport();
        let theChild, found;

        if ( numChildren > 0 ) {

            // reverse loop to first handle top layers
            theChild = this._children[ numChildren - 1 ];

            switch ( event.type ) {

                // all touch events
                default:
                    let eventOffsetX = 0, eventOffsetY = 0;

                    const touches: TouchList = ( event as TouchEvent ).changedTouches;
                    let i = 0;
                    let l = touches ? touches.length : 0;

                    if ( l > 0 ) {
                        let { x, y } = this.getCoordinate();
                        if ( viewport ) {
                            // TODO when canvas isn't full screen the pointer is nowhere to be seen
                            x -= viewport.left;
                            y -= viewport.top;
                        }

                        // zCanvas supports multitouch, process all pointers

                        for ( i = 0; i < l; ++i ) {
                            const touch = touches[ i ];
                            const { identifier } = touch;

                            eventOffsetX = ( touch.pageX - x ) / this.zoomFactor; // QQQ
                            eventOffsetY = ( touch.pageY - y ) / this.zoomFactor; // QQQ

                            switch ( event.type ) {
                                // on touchstart events, when we a Sprite handles the event, we
                                // map the touch identifier to this Sprite
                                case "touchstart":
                                    while ( theChild ) {
                                        if ( !this._aTchs.includes( theChild ) && theChild.handleInteraction( eventOffsetX, eventOffsetY, event )) {
                                            this._aTchs[ identifier ] = theChild;
                                            break;
                                        }
                                        theChild = theChild.last;
                                    }
                                    theChild = this._children[ numChildren - 1 ];
                                    break;
                                // on all remaining touch events we retrieve the Sprite associated
                                // with the event pointer directly
                                default:
                                    theChild = this._aTchs[ identifier ];
                                    if ( theChild?.handleInteraction( eventOffsetX, eventOffsetY, event )) {
                                        // all events other than touchmove should be treated as a release
                                        if ( event.type !== "touchmove" ) {
                                            this._aTchs[ identifier ] = undefined;
                                        }
                                    }
                                    break;

                            }
                        }
                    }
                    break;

                // all mouse events
                case "mousedown":
                case "mousemove":
                case "mouseup":
                    let { offsetX, offsetY } = ( event as MouseEvent );
                    // QQQ in case move and up event are fired outside of the canvas element
                    // we must translate the event coordinates to be relative to the canvas
                    if ( event.target !== this._el ) {
                        const { x, y } = this.getCoordinate();
                        offsetX = ( event as MouseEvent ).pageX - x;
                        offsetY = ( event as MouseEvent ).pageY - y;
                    }
                    if ( viewport ) {
                        offsetX += viewport.left;
                        offsetY += viewport.top;
                    }
                    offsetX /= this.zoomFactor; // QQQ
                    offsetY /= this.zoomFactor; // QQQ

                    while ( theChild ) {
                        found = theChild.handleInteraction( offsetX, offsetY, event );
                        if ( found ) {
                            break;
                        }
                        theChild = theChild.last;
                    }
                    break;

                // scroll wheel
                case "wheel":
                    const { deltaX, deltaY } = event as WheelEvent;
                    const WHEEL_SPEED = 20;
                    const xSpeed = deltaX === 0 ? 0 : deltaX > 0 ? WHEEL_SPEED : -WHEEL_SPEED;
                    const ySpeed = deltaY === 0 ? 0 : deltaY > 0 ? WHEEL_SPEED : -WHEEL_SPEED;
                    this.panViewport( viewport!.left + xSpeed, viewport!.top + ySpeed, true );
                    break;
            }
        }
        if ( this._prevDef ) {
            event.stopPropagation();
            event.preventDefault();
        }
        // update the Canvas contents
        this.invalidate();
    }

    override dispose(): void {
        super.dispose();

        this.interactionPane?.dispose();
        this.interactionPane = null;
    }
}
export default ZoomableCanvas;
