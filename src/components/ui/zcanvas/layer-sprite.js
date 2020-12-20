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
import { LAYER_GRAPHIC, LAYER_MASK }   from "@/definitions/layer-types";

class LayerSprite extends sprite {
    constructor( layer ) {
        if ( layer.type === LAYER_GRAPHIC && !layer.bitmap ) {
            // create a Bitmap on which this layer will render its drawable content.
            // assign this Bitmap to the layer
            const { cvs } = createCanvas( layer.width, layer.height );
            layer.bitmap = cvs;
        }
        let { bitmap, x, y, width, height } = layer;

        // zCanvas inheritance
        super({ bitmap, x, y, width, height } );
        this.setDraggable( true );

        this._layer = layer;

        // create brush (always as all layers can be maskable)
        const brushCanvas = createCanvas();
        this._brushCvs    = brushCanvas.cvs;
        this._brushCtx    = brushCanvas.ctx;
        this._halfRadius  = 0;

        this.cacheGradient( "rgba(255,0,0,1)" );
    }

    isDrawable() {
        return this._layer.type === LAYER_GRAPHIC || this.isMaskable();
    }

    isMaskable() {
        return !!this._layer.mask;
    }

    cacheGradient( color, radius = 30 ) {
        const innerRadius = radius / 6;
        const outerRadius = radius * 2;

        const x = radius;
        const y = radius;

        // update brush Canvas size
        this._brushCvs.width  = outerRadius;
        this._brushCvs.height = outerRadius;

        const gradient = this._brushCtx.createRadialGradient( x, y, innerRadius, x, y, outerRadius );
        gradient.addColorStop( 0, color );
        gradient.addColorStop( 1, 'rgba(255,255,255,0)' );

        this._brushCtx.clearRect( 0, 0, this._brushCvs.width, this._brushCvs.height );
        this._brushCtx.arc( x, y, radius, 0, 2 * Math.PI );
        this._brushCtx.fillStyle = gradient;
        this._brushCtx.fill();

        this._halfRadius = radius / 2;
    }

    // overridden from zCanvas.sprite
    handleMove( x, y ) {
        if ( !this.isDrawable() ) {
            return super.handleMove( x, y );
        }
        // cache this upfront
        const ctx = this.isMaskable() ? this._layer.mask.getContext( "2d" ) : this._bitmap.getContext( "2d" );
        // note we draw onto the layer bitmap to make this permanent
        ctx.drawImage( this._brushCvs, x - this._halfRadius, y - this._halfRadius );
    }
}
export default LayerSprite;
