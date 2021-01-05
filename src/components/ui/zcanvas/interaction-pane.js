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
import { isInsideTransparentArea } from "@/utils/canvas-util";
import LayerSprite from "@/components/ui/zcanvas/layer-sprite";

export const MODE_PAN          = 0;
export const MODE_LAYER_SELECT = 1;

/**
 * InteractionPane is a top-level canvas-sized Sprite that captures all Canvas
 * interaction events. This is used to:
 *
 * 1. control viewport panning when dragging over the canvas in panMode
 * 2. select the active layer by finding non-transparent pixels at the pointer position
 */
class InteractionPane extends sprite {
    constructor( zCanvas, type = MODE_PAN ) {
        super({
            width  : zCanvas.getWidth()  / zCanvas.zoomFactor,
            height : zCanvas.getHeight() / zCanvas.zoomFactor
        });
        this.setDraggable( true );
        this.type = type;
    }

    handlePress( x, y ) {
        super.handlePress( x, y );

        if ( this.type === MODE_LAYER_SELECT ) {
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
        } else if ( this.isDragging ) {
            this.vp = this.canvas._viewport;
            this._vpStartX = this.vp.left;
            this._vpStartY = this.vp.top;
        }
    }

    handleMove( x, y ) {
        if ( this.type !== MODE_PAN ) {
            return;
        }
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
export default InteractionPane;
