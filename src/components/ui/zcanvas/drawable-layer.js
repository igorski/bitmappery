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
import { LAYER_MASK }   from "@/definitions/layer-types";

function DrawableLayer( layer ) {
    if ( !layer.bitmap ) {
        // create a Bitmap on which this layer will render its drawable content.
        // assign this Bitmap to the layer
        const { cvs } = createCanvas( layer.width, layer.height );
        layer.bitmap = cvs;
    }
    let { bitmap, x, y, width, height } = layer;
    const ctx = bitmap.getContext( "2d" );

    const mask = layer.type === LAYER_MASK;

    // zCanvas inheritance
    DrawableLayer.super( this, "constructor", { bitmap, x, y, width, height, mask } );
    this.setDraggable( true );

    // TODO: setters and cache for these
    const opacity = .5; // 0 - 1 range
    ctx.globalAlpha = opacity;

    this.halfRadius = 0;

    const { cvs: brush, ctx: brushCtx } = createCanvas();

    this.cacheGradient = function( color, radius = 30 )
    {
        const innerRadius = radius / 6;
        const outerRadius = radius * 2;

        x = radius;
        y = radius;

        // update brush Canvas size
        brush.width  = outerRadius;
        brush.height = outerRadius;

        const gradient = brushCtx.createRadialGradient( x, y, innerRadius, x, y, outerRadius );
        gradient.addColorStop( 0, color );
        gradient.addColorStop( 1, 'rgba(255,255,255,0)' );

        brushCtx.clearRect( 0, 0, brush.width, brush.height );
        brushCtx.arc( x, y, radius, 0, 2 * Math.PI );
        brushCtx.fillStyle = gradient;
        brushCtx.fill();

        this.halfRadius = radius / 2;
    },

    this.handleMove = function( x, y )
    {
        // TODO: this zoomFactor should be taken into account by handleInteraction of zCanvas !!
        // BECAUSE IT DOES NOT WORK FOR HANDLEPRESS CURRENTLY
        x /= this.canvas.zoomFactor;
        y /= this.canvas.zoomFactor;

        ctx.drawImage( brush, x - this.halfRadius, y - this.halfRadius );
    }
    this.cacheGradient( "rgba(255,0,0,1)" );
}
sprite.extend( DrawableLayer );
export default DrawableLayer;
