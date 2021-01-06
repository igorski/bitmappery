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

const HALF = .5;

class ZoomableSprite extends sprite {
    constructor( opts ) {
        super( opts );
    }

    /* zCanvas.sprite overrides */

    // see QQQ comments to see what the difference is. Ideally these changes
    // should eventually be propagated to the zCanvas library.

    draw( canvasContext, viewport = null ) {

        // extend in subclass if you're drawing a custom object instead of a graphical Image asset
        // don't forget to draw the child display list when overriding this method!

        if ( !this.canvas ) {
            return;
        }

        const bounds = this._bounds;

        // only render when associated bitmap is ready
        let render = this._bitmapReady;

        // QQQ the viewport bounds check breaks on Safari for rotated content???
        /*
        if ( render && viewport ) {
            // ...and content is within visual bounds if a viewport was defined
            render = isInsideViewport( this._bounds, viewport );
        }
        */
        // E.O. QQQ

        canvasContext.save();

        // Sprite acts as a mask for underlying Sprites ?

        if ( this._mask ) {
            canvasContext.globalCompositeOperation = "destination-in";
        }

        if ( render ) {

            const aniProps = this._animation;
            let { left, top, width, height } = bounds;

            // note we use a fast rounding operation to prevent fractional values

            if ( !aniProps ) {

                // no spritesheet defined

                if ( viewport )
                {
                    // bounds are defined, draw partial Bitmap
                    const { src, dest } = calculateDrawRectangle( bounds, viewport );
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
                } else {
                    // no bounds defined, draw entire Bitmap
                    canvasContext.drawImage(
                        this._bitmap,
                        ( HALF + left )   << 0,
                        ( HALF + top )    << 0,
                        ( HALF + width )  << 0,
                        ( HALF + height ) << 0
                    );
                }
            }
            else {

                // spritesheet defined, draw tile

                const tileWidth  = aniProps.tileWidth  ? aniProps.tileWidth  : ( HALF + width )  << 0;
                const tileHeight = aniProps.tileHeight ? aniProps.tileHeight : ( HALF + height ) << 0;

                if ( viewport ) {
                    left -= viewport.left;
                    top  -= viewport.top;
                }

                canvasContext.drawImage(
                    this._bitmap,
                    aniProps.col      * tileWidth,  // tile x offset
                    aniProps.type.row * tileHeight, // tile y offset
                    tileWidth,
                    tileHeight,
                    ( HALF + left )   << 0,
                    ( HALF + top )    << 0,
                    ( HALF + width )  << 0,
                    ( HALF + height ) << 0
                );
            }
        }

        // draw this Sprites children onto the canvas

        let theSprite = this._children[ 0 ];
        while ( theSprite ) {
            theSprite.draw( canvasContext, viewport );
            theSprite = theSprite.next;
        }

        // restore canvas drawing operation so subsequent sprites draw as overlay

        if ( this._mask ) {
            canvasContext.globalCompositeOperation = "source-over";
        }
        canvasContext.restore();

        // draw an outline when in debug mode

        if ( this.canvas.DEBUG ) {
            this.drawOutline( canvasContext );
        }
    }
}
export default ZoomableSprite;

/* internal methods */

// taken (unchanged) from zcanvas/src/utils/image-math

function calculateDrawRectangle( spriteBounds, viewport ) {
    let { left, top, width, height } = spriteBounds;
    const {
        left: viewportX,
        top: viewportY,
        width: viewportWidth,
        height: viewportHeight
    } = viewport;

    // NOTE: for the source we don't have to take image scaling into account
    // as the source is always drawn at the same scale relative to the canvas / viewpor
    // see unbounded render behaviour in Sprite.draw()

    if ( left > viewportX ) {
        width = Math.min( width, viewportWidth - ( left - viewportX ));
    } else {
        width = Math.min( viewportWidth, width - ( viewportX - left ));
    }
    if ( top > viewportY ) {
        height = Math.min( height, viewportHeight - ( top - viewportY ));
    } else {
        height = Math.min( viewportHeight, height - ( viewportY - top ));
    }

    return {
        src: {
            // NOTE by default all Sprites draw their content from top left coordinate
            // we only correct for this if the visible area starts within the viewport
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
