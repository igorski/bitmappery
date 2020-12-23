/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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

class ZoomableCanvas extends canvas {
    constructor( opts, store ) {
        super( opts );
        // Vuex root store reference
        this.store = store;
        this.setZoomFactor( 1 );
    }

    setZoomFactor( xScale, yScale ) {
        this.zoomFactor = xScale;

        // This zoom factor logic should move into the zCanvas
        // library where updateCanvasSize() takes this additional factor into account

        this._canvasContext.scale( xScale, yScale );
        this.invalidate();
    }

    // TODO add the lines suffixed with // QQQ to zCanvas lib instead of using these overrides

    render() {
        this._canvasContext.clearRect( 0, 0, this._width / this.zoomFactor, this._height / this.zoomFactor ); // QQQ
        super.render();
    }

    handleInteraction( aEvent ) {
        const numChildren  = this._children.length;
        let theChild, touches, found;

        if ( numChildren > 0 ) {

            // reverse loop to first handle top layers
            theChild = this._children[ numChildren - 1 ];

            switch ( aEvent.type ) {

                // all touch events
                default:
                    let eventOffsetX = 0, eventOffsetY = 0;
                    touches /** @type {TouchList} */ = ( aEvent.touches.length > 0 ) ? aEvent.touches : aEvent.changedTouches;

                    if ( touches.length > 0 ) {
                        const offset = this.getCoordinate();

                        eventOffsetX = ( touches[ 0 ].pageX - offset.x ) / this.zoomFactor ; // QQQ
                        eventOffsetY = ( touches[ 0 ].pageY - offset.y ) / this.zoomFactor; // QQQ
                    }

                    while ( theChild ) {
                        theChild.handleInteraction( eventOffsetX, eventOffsetY, aEvent );
                        theChild = theChild.last; // note we don't break this loop for multi touch purposes
                    }
                    break;

                // all mouse events
                case "mousedown":
                case "mousemove":
                case "mouseup":
                    let { offsetX, offsetY } = aEvent;
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
            }
        }
        if ( this._preventDefaults ) {
            aEvent.stopPropagation();
            aEvent.preventDefault();
        }
        // update the Canvas contents
        this.invalidate();
    }
}
export default ZoomableCanvas;
