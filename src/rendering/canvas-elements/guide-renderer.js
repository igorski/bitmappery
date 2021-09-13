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
import { SNAP_MARGIN } from "@/definitions/tool-types";
import { fastRound } from "@/math/unit-math";
import { isCoordinateInHorizontalRange, isCoordinateInVerticalRange } from "@/math/point-math";
import { getClosestSnappingPoints } from "@/rendering/snapping";

class GuideRenderer extends sprite  {
    constructor( zCanvasInstance = null ) {
        super({ interactive: false });
        zCanvasInstance?.addChild( this );
    }

    /* public methods */

    stayOnTop() {
        const zCanvas = this.canvas;
        zCanvas?.removeChild( this );
        zCanvas?.addChild( this );
    }

    draw( ctx, viewport = null ) {
        if ( !this.canvas.guides || !this.canvas.draggingSprite ) {
            return;
        }
        const left = viewport?.left || 0;
        const top  = viewport?.top  || 0;

        // we can snap the currently draggingSprite against its edge and center
        const guides = getClosestSnappingPoints( this.canvas.draggingSprite, this.canvas.guides );
        ctx.strokeStyle = "red";

        for ( const { x, y, width, height } of guides ) {
            // make up for canvas viewport offset
            const localX = x - left;
            const localY = y - top;

            ctx.beginPath();
            ctx.moveTo( fastRound( localX ), fastRound( localY ));
            ctx.lineTo( fastRound( localX + width ), fastRound( localY + height ));
            ctx.stroke();
        }
    }
};
export default GuideRenderer;
