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
import { sprite } from "zcanvas";

/**
 * Scrollpane is a very cheap hack to control the viewport panning
 * by overlaying the entire zCanvas display list with one canvas-sized
 * Sprite capturing all pointer events.
 */
class Scrollpane extends sprite {
    constructor( zCanvas ) {
        super({
            width  : zCanvas.getWidth()  / zCanvas.zoomFactor,
            height : zCanvas.getHeight() / zCanvas.zoomFactor
        });
        this.setDraggable( true );
    }

    handlePress( x, y ) {
        super.handlePress( x, y );

        if ( this.isDragging ) {
            this.vp = this.canvas._viewport;
            this._vpStartX = this.vp.left;
            this._vpStartY = this.vp.top;
        }
    }

    handleMove( x, y ) {
        const distX = this.vp.left - this._vpStartX;
        const distY = this.vp.top  - this._vpStartY;

        const deltaX = (( x - this._dragStartEventCoordinates.x ) * this.canvas.zoomFactor ) - distX;
        const deltaY = (( y - this._dragStartEventCoordinates.y ) * this.canvas.zoomFactor ) - distY;

        this.canvas.panViewport( this._vpStartX - deltaX, this._vpStartY - deltaY, true );
    }

    // DEBUG only
/*
    draw( ctx, vp ) {
        ctx.fillStyle = "rgba(255,0,128,.5)";
        ctx.fillRect( 0, 0, this._bounds.width, this._bounds.height );
    }
*/
}
export default Scrollpane;
