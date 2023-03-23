/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022-2023 - https://www.igorski.nl
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
import { selectByColor } from "@/math/selection-math";

const TWO_PI = Math.PI * 2;

/**
 * Uses a flood fill to fill given canvasContext with given fillColor. The fill
 * starts from given source coordinate and will fill all colors that match that
 * of the source coordinate.
 *
 * @param {CanvasRenderingContext2D} ctx context to render on
 * @param {Number} sourceX x-coordinate of the fill origin
 * @param {Number} sourceY y-coordinate of the fill origin
 * @param {String} fillColor RGBA String value for the fill color
 * @param {Number=} feather optional amount of pixels at edges to fill (less aliased result)
 */
export const floodFill = ( ctx: CanvasRenderingContext2D, sourceX: number, sourceY: number,
    fillColor: string, feather = 5 ): void => {
    const path = selectByColor( ctx.canvas, sourceX, sourceY );

    ctx.strokeStyle = fillColor;
    ctx.fillStyle   = fillColor;
    ctx.lineWidth   = feather;
    ctx.lineJoin    = "round";
    ctx.lineCap     = "round";

    let point, nextPoint;

    if ( path.length < 3 ) {
        point = path[ 0 ];
        ctx.beginPath();
        ctx.arc( point.x, point.y, ctx.lineWidth / 2, 0, TWO_PI, true );
        ctx.fill();
        ctx.closePath();
    } else {
        ctx.beginPath() ;
        ctx.moveTo( path[ 0 ].x, path[ 0 ].y );

        for ( let i = 1, l = path.length - 2; i < l; i++ ) {
            point     = path[ i ];
            nextPoint = path[ i + 1 ];
            const c = ( point.x + nextPoint.x ) / 2;
            const d = ( point.y + nextPoint.y ) / 2;
            ctx.quadraticCurveTo( point.x, point.y, c, d );
        }
        const penultimate = path[ path.length - 2 ];
        const lastPoint   = path[ path.length - 1 ];

        ctx.quadraticCurveTo( penultimate.x, penultimate.y, lastPoint.x, lastPoint.y );
        ctx.stroke();
    }
    ctx.fill();
}
