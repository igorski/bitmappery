/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2022 - https://www.igorski.nl
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
import { Sprite } from "zcanvas";
import type { Rectangle, Viewport, IRenderer } from "zcanvas";
import ZoomableCanvas from "./zoomable-canvas";

const { min } = Math;
const HALF    = 0.5;

class ZoomableSprite extends Sprite {
    constructor( opts: any ) {
        super( opts );
    }

    protected getCanvas(): ZoomableCanvas {
        return this.canvas as ZoomableCanvas;
    }

    protected drawCropped( renderer: IRenderer, { src, dest }: { src: Rectangle, dest: Rectangle } ): void {
        renderer.drawImageCropped(
            this._resourceId,
            src.left, src.top, src.width, src.height,
            dest.left, dest.top, dest.width, dest.height,
            this.getDrawProps()
        );
    }
    
    /* zCanvas overrides */

    // unlike regular zCanvas Sprites, ZoomableSprites don't function as masks, don't support tile
    // sheets and have no children

    override draw( renderer: IRenderer, viewport?: Viewport ): void {
        if ( !this.isVisible( viewport )) {
            return;
        }
        // TODO: should Canvas zoomFactor be applied to DrawProps scale ?
        const { zoomFactor } = this.getCanvas();
        
        if ( viewport ) {
            this.drawCropped( renderer, calculateDrawRectangle( this.getBounds( true ), viewport ));
        } else {
            const { left, top, width, height } = this._bounds;
            renderer.drawImage( this._resourceId, left, top, width, height, this.getDrawProps() );
        }
    }
}
export default ZoomableSprite;

/* internal methods */

/**
 * If the full zCanvas "document" is represented inside a smaller, pannable viewport
 * we can omit drawing a Sprites unseen pixels by calculating the visible area from both
 * the source drawable and destination canvas context.
 */
export const calculateDrawRectangle = ({ left, top, width, height }: Rectangle, viewport: Viewport ): { src: Rectangle, dest: Rectangle } => {
    const {
        left   : viewportX,
        top    : viewportY,
        width  : viewportWidth,
        height : viewportHeight
    } = viewport;

    if ( left > viewportX ) {
        width = min( width, viewportWidth - ( left - viewportX ));
    } else {
        width = min( viewportWidth, width - ( viewportX - left ));
    }
    if ( top > viewportY ) {
        height = min( height, viewportHeight - ( top - viewportY ));
    } else {
        height = min( viewportHeight, height - ( viewportY - top ));
    }

    return {
        src: {
            left : left > viewportX ? 0 : viewportX - left,
            top  : top  > viewportY ? 0 : viewportY - top,
            width,
            height
        },
        dest: {
            left : left > viewportX ? left - viewportX : 0,
            top  : top  > viewportY ? top  - viewportY : 0,
            width,
            height
        }
    };
};
