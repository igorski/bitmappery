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
import { canvas } from "zcanvas";
import InteractionPane from "@/rendering/canvas-elements/interaction-pane";
import { fastRound } from "@/math/unit-math";
import { renderState } from "@/services/render-service";

class ZoomableCanvas extends canvas {
    constructor( opts, store, rescaleFn, refreshFn ) {
        super( opts );

        // Vuex root store reference
        this.store = store;
        // rescale handler used to match parent component with zCanvas rescales
        this.rescaleFn = rescaleFn;
        // refresh handler used to force rebuild of all Layer renderers
        this.refreshFn = refreshFn;

        this.documentScale = 1;
        this.setZoomFactor( 1 );
        this.interactionPane = new InteractionPane();
        this._bounds = null; // TODO : can be removed after update to zCanvas 5.1.5 (requires Webpack 5 migration)

        // reference to Sprite that is being dragged (see LayerSprite)
        this.draggingSprite = null;
    }

    setDocumentScale( targetWidth, targetHeight, scale, zoom, activeDocument = null ) {
        const { left, top, width, height } = this._viewport;

        let scrollWidth  = this._width  - width;
        let scrollHeight = this._height - height;

        // cache the current scroll offset so we can zoom from the current offset
        // note that by default we zoom from the center (when document was unscrolled)
        const ratioX = ( left / scrollWidth )  || .5;
        const ratioY = ( top  / scrollHeight ) || .5;

        this.setDimensions( fastRound( targetWidth ), fastRound( targetHeight ), true, true );
        this.setZoomFactor( scale * zoom, scale * zoom ); // eventually replace with zCanvas.setZoom()

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

    getActiveDocument() {
        return this.store.getters.activeDocument;
    }

    setInteractive( isInteractive ) {
        this._interactionBlocked = !isInteractive;
    }

    getViewport() {
        return this._viewport;
    }

    setZoomFactor( scale ) {
        this.zoomFactor = scale;

        // This zoom factor logic should move into the zCanvas
        // library where updateCanvasSize() takes this additional factor into account

        this._canvasContext.scale( scale, scale );
        this.invalidate();
    }

    setLock( locked ) {
        this.locked = locked; // freezes current Canvas contents for a single render cycle
    }

    setGuides( guides ) {
        this.guides = guides;
    }

    requestDeferredRender( force = this._animate ) {
        // keeps render loop going when Canvas is animatable
        if ( !this._disposed && force && !this._renderPending ) {
            this._renderPending = true;
            this._renderId = window.requestAnimationFrame( this._renderHandler );
        }
    }

    /* zCanvas.canvas overrides */

    // TODO : can be removed after update to zCanvas 5.1.5 (requires Webpack 5 migration)
    getCoordinate() {
        if ( this._bounds === null ) {
            this._bounds = this._element.getBoundingClientRect();
        }
        return this._bounds;
    }

    // see QQQ comments to see what the difference is. Ideally these changes
    // should eventually be propagated to the zCanvas library.

    render() {
        const now   = Date.now();  // current timestamp
        const delta = now - this._lastRender;

        this._renderPending = false;
        this._lastRender    = now - ( delta % this._renderInterval );

        // QQQ to prevent flickering between frames in which states update, we
        // can lock the canvas to keep the existing contents on screen
        if ( renderState.pending > 0 || this.locked ) {
            // console.info("no render. pending:" + renderState.pending + " lock:" + this.locked);
            this.locked = false;
            return this.requestDeferredRender( true );
        }

        // in case a resize was requested execute it now as we will
        // immediately draw new contents onto the screen

        if ( this._enqueuedSize ) {
            updateCanvasSize( this );
        }

        const ctx = this._canvasContext;
        let theSprite;

        if ( ctx ) {

            // QQQ zoomFactor must be taken into account

            const { zoomFactor } = this;

            const width  = fastRound( this._width  / zoomFactor );
            const height = fastRound( this._height / zoomFactor );

            const viewport = { ...this._viewport };
            Object.entries( viewport ).forEach(([ key, value ]) => {
                viewport[ key ] = value / zoomFactor;
            });

            // E.O. QQQ

            // clear previous canvas contents either by flooding it
            // with the optional background colour, or by clearing all pixel content

            if ( this._bgColor ) {
                ctx.fillStyle = this._bgColor;
                ctx.fillRect( 0, 0, width, height );
            }
            else {
                ctx.clearRect( 0, 0, width, height );
            }

            const useExternalUpdateHandler = typeof this._updateHandler === "function";

            if ( useExternalUpdateHandler ) {
                this._updateHandler( now );
            }

            // draw the children onto the canvas

            theSprite = this._children[ 0 ];

            while ( theSprite ) {
                if ( !useExternalUpdateHandler ) {
                    theSprite.update( now );
                }
                theSprite.draw( ctx, viewport );
                theSprite = theSprite.next;
            }
        }
        this.requestDeferredRender();
    }

    handleInteraction( aEvent ) {
        if ( this._interactionBlocked ) {
            return;
        }
        const numChildren = this._children.length;
        const viewport    = this._viewport;
        let theChild, found;

        if ( numChildren > 0 ) {

            // reverse loop to first handle top layers
            theChild = this._children[ numChildren - 1 ];

            switch ( aEvent.type ) {

                // all touch events
                default:
                    let eventOffsetX = 0, eventOffsetY = 0;

                    const touches /** @type {TouchList} */ = event.changedTouches || [];
                    let i = 0, l = touches.length;

                    if ( l > 0 ) {
                        let { x, y } = this.getCoordinate();
                        if ( viewport ) {
                            // TODO when canvas isn't full screen the pointer is nowhere to be seen
                            x -= viewport.left;
                            y -= viewport.top;
                        }

                        // zCanvas supports multitouch, process all pointers

                        for ( i = 0; i < l; ++i ) {
                            const touch          = touches[ i ];
                            const { identifier } = touch;

                            eventOffsetX = ( touch.pageX - x ) / this.zoomFactor; // QQQ
                            eventOffsetY = ( touch.pageY - y ) / this.zoomFactor; // QQQ

                            switch ( event.type ) {
                                // on touchstart events, when we a Sprite handles the event, we
                                // map the touch identifier to this Sprite
                                case "touchstart":
                                    while ( theChild ) {
                                        if ( !this._activeTouches.includes( theChild ) && theChild.handleInteraction( eventOffsetX, eventOffsetY, event )) {
                                            this._activeTouches[ identifier ] = theChild;
                                            break;
                                        }
                                        theChild = theChild.last;
                                    }
                                    theChild = this._children[ numChildren - 1 ];
                                    break;
                                // on all remaining touch events we retrieve the Sprite associated
                                // with the event pointer directly
                                default:
                                    theChild = this._activeTouches[ identifier ];
                                    if ( theChild?.handleInteraction( eventOffsetX, eventOffsetY, event )) {
                                        // all events other than touchmove should be treated as a release
                                        if ( event.type !== "touchmove" ) {
                                            this._activeTouches[ identifier ] = null;
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
                    let { offsetX, offsetY } = aEvent;
                    // QQQ in case move and up event are fired outside of the canvas element
                    // we must translate the event coordinates to be relative to the canvas
                    if ( event.target !== this._element ) {
                        const { x, y } = this.getCoordinate();
                        offsetX = aEvent.pageX - x;
                        offsetY = aEvent.pageY - y;
                    }
                    if ( viewport ) {
                        offsetX += viewport.left;
                        offsetY += viewport.top;
                    }
                    offsetX /= this.zoomFactor; // QQQ
                    offsetY /= this.zoomFactor; // QQQ

                    while ( theChild ) {
                        found = theChild.handleInteraction( offsetX, offsetY, aEvent );
                        if ( found ) {
                            break;
                        }
                        theChild = theChild.last;
                    }
                    break;

                // scroll wheel
                case "wheel":
                    const { deltaX, deltaY } = aEvent;
                    const WHEEL_SPEED = 20;
                    const xSpeed = deltaX === 0 ? 0 : deltaX > 0 ? WHEEL_SPEED : -WHEEL_SPEED;
                    const ySpeed = deltaY === 0 ? 0 : deltaY > 0 ? WHEEL_SPEED : -WHEEL_SPEED;
                    this.panViewport( viewport.left + xSpeed, viewport.top + ySpeed, true );
                    break;
            }
        }
        if ( this._preventDefaults ) {
            aEvent.stopPropagation();
            aEvent.preventDefault();
        }
        // update the Canvas contents
        this.invalidate();
    }

    dispose() {
        super.dispose();

        this.interactionPane?.dispose();
        this.interactionPane = null;
    }
}
export default ZoomableCanvas;

/* internal methods */

/**
 * literal clone of zCanvas code, only duplicated here because
 * of custom render() method. When zoomFactor code is ported to base zCanvas
 * library this can go (and custom render() can just call super class behaviour
 * after the deferred logic calculation)
 *
 * @param {Canvas} canvasInstance
 */
function updateCanvasSize( canvasInstance ) {
    const scaleFactor = canvasInstance._HDPIscaleRatio;
    const viewport    = canvasInstance._viewport;
    let width, height;

    if ( canvasInstance._enqueuedSize ) {
        ({ width, height } = canvasInstance._enqueuedSize );
        canvasInstance._enqueuedSize = null;
        /** @protected @type {number} */ canvasInstance._width  = width;
        /** @protected @type {number} */ canvasInstance._height = height;
    }

    if ( viewport ) {
        const cvsWidth  = canvasInstance._width;
        const cvsHeight = canvasInstance._height;

        width  = Math.min( viewport.width,  cvsWidth );
        height = Math.min( viewport.height, cvsHeight );

        // in case viewport was panned beyond the new canvas dimensions
        // reset pan to center.
/*
        if ( viewport.left > cvsWidth ) {
            viewport.left  = cvsWidth * .5;
            viewport.right = viewport.width + viewport.left;
        }
        if ( viewport.top > cvsHeight ) {
            viewport.top    = cvsHeight * .5;
            viewport.bottom = viewport.height + viewport.top;
        }
*/
    }

    if ( width && height ) {
        const element = canvasInstance._element;

        element.width  = width  * scaleFactor;
        element.height = height * scaleFactor;

        element.style.width  = `${width}px`;
        element.style.height = `${height}px`;
    }
    canvasInstance._canvasContext.scale( scaleFactor, scaleFactor );

    // non-smoothing must be re-applied when the canvas dimensions change...

    if ( canvasInstance._smoothing === false ) {
        canvasInstance.setSmoothing( false );
    }
    canvasInstance._bounds = null; // TODO : can be removed after update to zCanvas 5.1.5 (requires Webpack 5 migration)
}
