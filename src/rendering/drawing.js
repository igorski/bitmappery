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
import BrushTypes, { getSizeForBrush } from "@/definitions/brush-types";
import { createDrawable } from "@/factories/brush-factory";
import { randomInRange } from "@/math/unit-math";
import { applyOverrideConfig } from "@/rendering/lowres";
import { distanceBetween, angleBetween, pointBetween } from "@/math/point-math";

const { cos, sin } = Math;
const TWO_PI = Math.PI * 2;

/**
 * Render a series of registered pointer offset into a single brush stroke
 * Adapted from studies provided by Juriy Zaytsev
 *
 * @param {CanvasRenderingContext2D} ctx to render on
 * @param {Object} brush properties
 * @param {zCanvas.sprite} sprite defining relative (on-screen) Layer coordinates
 * @param {Object=} overrideConfig optional override to use (defines alternate pointers and coordinate scaling)
 */
export const renderBrushStroke = ( ctx, brush, sprite, overrideConfig ) => {
    let { pointers, radius, halfRadius, doubleRadius, options } = brush;
    let scale = 1;
    const { type } = options;

    if ( overrideConfig ) {
        pointers      = overrideConfig.pointers;
        scale         = overrideConfig.zoom;
        radius       *= scale;
        halfRadius   *= scale;
        doubleRadius *= scale;

        applyOverrideConfig( overrideConfig, pointers );
    }

    if ( pointers.length < 2 ) {
        return;
    }

    const lineWidth = getSizeForBrush( brush );

    ctx.save();
    ctx.lineJoin = ctx.lineCap = "round";

    for ( let i = 1; i < pointers.length; ++i ) {
        const isFirst   = i === 1;
        const prevPoint = pointers[ i - 1 ];
        const point     = pointers[ i ];

        // paint brush types

        if ( type === BrushTypes.PAINT_BRUSH ) {
            const dist  = distanceBetween( prevPoint, point );
            const angle = angleBetween( prevPoint, point );

            const incr = radius * 0.25;
            const sin  = Math.sin( angle );
            const cos  = Math.cos( angle );

            let x, y, size, doubleSize;
            for ( let j = 0; j < dist; j += incr ) {
                x = prevPoint.x + ( sin * j );
                y = prevPoint.y + ( cos * j );
                ctx.fillStyle = createDrawable( brush, ctx, x, y, scale );
                ctx.fillRect( x - radius, y - radius, doubleRadius, doubleRadius );
            }
            continue;
        }

        if ( type === BrushTypes.SPRAY ) {
            ctx.fillStyle = brush.colors[ 0 ];
            let j = doubleRadius;
            while ( j-- > 0 ) {
                const angle = randomInRange( 0, TWO_PI );
                const size  = randomInRange( 1, 3 );
                ctx.fillRect(
                    point.x + randomInRange( -radius, radius ) * cos( angle ),
                    point.y + randomInRange( -radius, radius ) * sin( angle ),
                    size, size
                );
            }
            continue;
        }

        // line types

        ctx.strokeStyle = brush.colors[ 0 ];

        if ( type === BrushTypes.LINE ) {
            if ( isFirst ) {
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.moveTo( prevPoint.x, prevPoint.y );
            }
            ctx.lineTo( point.x, point.y );
            ctx.stroke();
            continue;
        }

        if ( type === BrushTypes.CALLIGRAPHIC ) {
            if ( isFirst ) {
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
            }
            const min = ( radius * 0.2 ) * 0.66666;
            const max = ( radius * 0.2 ) * 1.33333;

            [ -max, -min, 0, min, max ].forEach( offset => {
                ctx.moveTo( prevPoint.x + offset, prevPoint.y + offset );
                ctx.lineTo( point.x + offset, point.y + offset );
                ctx.stroke();
            });
            continue;
        }

        // this one benefits from working with a large point queue
        // as such when supplying overrideConfig for live rendering, regular line is drawn instead

        if ( type === BrushTypes.CONNECTED ) {
            if ( isFirst ) {
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.moveTo( prevPoint.x, prevPoint.y );
            }
            ctx.lineTo( point.x, point.y );
            const nearPoint = pointers[ i - 5 ];
            if ( nearPoint ) {
                ctx.moveTo( nearPoint.x, nearPoint.y );
                ctx.lineTo( point.x, point.y );
            }
            ctx.stroke();
            continue;
        }

        if ( type === BrushTypes.NEAREST ) {
            const lastPoint = pointers[ pointers.length - 1 ];

            if ( isFirst ) {
                const penultimate = pointers[ pointers.length - 2 ];
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.moveTo( penultimate.x, penultimate.y );
                ctx.lineTo( lastPoint.x,   lastPoint.y );
                ctx.stroke();
            }
            const dx = point.x - lastPoint.x;
            const dy = point.y - lastPoint.y;
            const d  = dx * dx + dy * dy;

            // when distance of line is in range of last point, connect to it
            if ( d < 1000 ) {
                const xOffset = dx * 0.2;
                const yOffset = dy * 0.2;
                ctx.beginPath();
                ctx.strokeStyle = brush.colors[ 1 ];
                ctx.moveTo( lastPoint.x + xOffset, lastPoint.y + yOffset );
                ctx.lineTo( point.x - xOffset, point.y - yOffset );
                ctx.stroke();
            }
            continue;
        }

        // multi stroke line type

        let dX = 0
        let dY = 0;
        const { smooth } = options;
        for ( let j = 0; j < options.strokes; ++j ) {
            switch ( type ) {
                default:
                case BrushTypes.PEN:
                    if ( isFirst && j === 0 ) {
                        ctx.beginPath();
                        ctx.lineWidth = lineWidth * randomInRange( 0.5, 1 );
                        if ( smooth ) {
                            ctx.moveTo( prevPoint.x - dX, prevPoint.y - dY );
                        }
                    }
                    if ( smooth ) {
                        const midPoint = pointBetween( prevPoint, point );
                        ctx.quadraticCurveTo( prevPoint.x - dX, prevPoint.y - dY, midPoint.x - dX, midPoint.y - dY );
                    } else {
                        ctx.moveTo( prevPoint.x - dX, prevPoint.y - dY );
                        ctx.lineTo( point.x - dX, point.y - dY );
                        ctx.stroke();
                    }
                    if ( smooth && i === pointers.length - 1 ) {
                        ctx.lineTo( point.x - dX, point.y - dY );
                        ctx.stroke();
                    }
                    break;
            }
            dX += randomInRange( 0, ctx.lineWidth );
            dY += randomInRange( 0, ctx.lineWidth );
        }
    }
    ctx.restore();
};
