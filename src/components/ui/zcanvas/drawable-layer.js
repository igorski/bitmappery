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
import { sprite }       from "zcanvas";
import { createCanvas } from "@/utils/canvas-util";

function DrawableLayer( layer ) {
    if ( !layer.bitmap ) {
        // create a Bitmap on which this layer will render its drawable content.
        // assign this Bitmap to the layer
        const { cvs } = createCanvas( layer.width, layer.height );
        layer.bitmap = cvs;
    }
    let { bitmap, x, y, width, height } = layer;
    const ctx = bitmap.getContext( "2d" );

    // zCanvas inheritance
    DrawableLayer.super( this, "constructor", { bitmap, x, y, width, height } );
    this.setDraggable( true );

    // TODO: setters and cache for these
    const radius = 30; // TODO: setter
    const innerRadius = 5;
    const outerRadius = 70;
    const opacity = .5; // 0 - 1 range
    ctx.globalAlpha = opacity;

    const { cvs: brush, ctx: brushCtx } = createCanvas( radius * 2, radius * 2 );

    // Radii of the white glow.
    // Radius of the entire circle.

    x = radius;
    y = radius;
    const gradient = brushCtx.createRadialGradient( x, y, innerRadius, x, y, outerRadius );
    gradient.addColorStop( 0, 'rgba(255,0,0,1)' );
    gradient.addColorStop( 1, 'rgba(255,255,255,1)' );

    brushCtx.arc( x, y, radius, 0, 2 * Math.PI );

    brushCtx.fillStyle = gradient;
    brushCtx.fill();

    this.handleMove = function( x, y ) {
        // TODO: this zoomFactor should be taken into account by handleInteraction of zCanvas !!
        // BECAUSE IT DOES NOT WORK FOR HANDLEPRESS CURRENTLY
        x /= this.canvas.zoomFactor;
        y /= this.canvas.zoomFactor;
        ctx.drawImage( brush, x - radius / 2, y - radius / 2 );
    }
}
sprite.extend( DrawableLayer );
export default DrawableLayer;