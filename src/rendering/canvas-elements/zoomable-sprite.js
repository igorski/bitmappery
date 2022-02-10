/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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

const { min } = Math;
const HALF    = 0.5;

class ZoomableSprite extends sprite {
    constructor( opts ) {
        super( opts );
    }

    drawCropped( canvasContext, { src, dest }) {
        canvasContext.drawImage(
            this._bitmap,
            ( HALF + src.left )    << 0,
            ( HALF + src.top )     << 0,
            ( HALF + src.width )   << 0,
            ( HALF + src.height )  << 0,
            ( HALF + dest.left )   << 0,
            ( HALF + dest.top )    << 0,
            ( HALF + dest.width )  << 0,
            ( HALF + dest.height ) << 0
        );
    }

    /* zCanvas overrides */

    // unlike regular zCanvas Sprites, ZoomableSprites don't function as masks, don't support tile
    // sheets and have no children

    draw( canvasContext, viewport = null ) {
        let render = this._bitmapReady;
        if ( render && viewport ) {
            render = isInsideViewport( this._bounds, viewport );
        }
        if ( !render ) {
            return;
        }
        if ( viewport ) {
            this.drawCropped( canvasContext, calculateDrawRectangle( this._bounds, viewport ));
        } else {
            const { left, top, width, height } = this._bounds;
            canvasContext.drawImage(
                this._bitmap,
                ( HALF + left )   << 0,
                ( HALF + top )    << 0,
                ( HALF + width )  << 0,
                ( HALF + height ) << 0
            );
        }
    }
};
export default ZoomableSprite;

/* internal methods */

export const isInsideViewport = ({ left, top, width, height }, viewport ) => {
    return ( left + width )  >= viewport.left && left <= viewport.right &&
           ( top  + height ) >= viewport.top  && top  <= viewport.bottom;
};

/**
 * If the full zCanvas "document" is represented inside a smaller, pannable viewport
 * we can omit drawing a Sprites unseen pixels by calculating the visible area from both
 * the source drawable and destination canvas context.
 */
export const calculateDrawRectangle = ({ left, top, width, height }, viewport ) => {
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
