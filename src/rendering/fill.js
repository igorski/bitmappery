/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022 - https://www.igorski.nl
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
const TWO_PI = Math.PI * 2;
const UP     = 0;
const LEFT   = 1;
const DOWN   = 2;
const RIGHT  = 3;

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
export const floodFill = ( ctx, sourceX, sourceY, fillColor, feather = 5 ) => {
    const canvasWidth  = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    sourceX = Math.min( canvasWidth  - 1, Math.round( sourceX ));
    sourceY = Math.min( canvasHeight - 1, Math.round( sourceY ));

    // the source color
    const [ r, g, b, a ] = ctx.getImageData( sourceX, sourceY, 1, 1 ).data;

    const imageData = ctx.getImageData( 0, 0, canvasWidth, canvasHeight ).data;

    // verification whether pixel starting at given index is of equal color as the source color
    const equalPixel = index => {
        return imageData[ index ]     === r &&
               imageData[ index + 1 ] === g &&
               imageData[ index + 2 ] === b &&
               imageData[ index + 3 ] === a;
    };

    // traverse up in the image to find a boundary (e.g. where color is different to the source)
    let x = sourceX;
    let y = sourceY;

    // linearIndex is the first index inside the imageData Array for the compare point
    // (note each point spans 4 indices for each color in the RGBA sequence)

    let linearIndex = ( y * canvasWidth + x ) * 4;
    while ( y >= 0 ) {
        const newLinearIndex = (( y - 1 ) * canvasWidth + x ) * 4;
        if ( equalPixel( newLinearIndex )) {
            --y;
            linearIndex = newLinearIndex;
        } else {
            break;
        }
    }

    // walk the pixels around the boundary until we have reached the boundary origin again

    const firstPoint = { x, y };
    const path = [ firstPoint ];
    let orientation = LEFT;

    do {
        let found = false;

        if ( path.length >= 2 ) {
            const lastPoint   = path[ path.length - 1 ];
            const penultimate = path[ path.length - 2 ];

            if ( lastPoint.y - penultimate.y < 0 ) {
                orientation = UP;
            } else if ( lastPoint.x - penultimate.x < 0 ) {
                orientation = LEFT;
            } else if ( lastPoint.y - penultimate.y > 0 ) {
                orientation = DOWN;
            } else if ( lastPoint.x - penultimate.x > 0 ) {
                orientation = RIGHT;
            }
        }

        for ( let direction = UP; direction <= RIGHT; direction++ ) {
            const both = ( orientation + direction ) % 4;
            if ( both === UP ) {
                // move to the right
                if (( x + 1 ) < canvasWidth ) {
                    linearIndex = ( y * canvasWidth + ( x + 1 )) * 4;
                    if ( equalPixel( linearIndex )) {
                        found = true;
                        ++x;
                    }
                }
            } else if ( both === LEFT ) {
                // move up
                if (( y - 1 ) >= 0 ) {
                    linearIndex = (( y - 1 ) * canvasWidth + x ) * 4;
                    if ( equalPixel( linearIndex )) {
                        found = true;
                        --y;
                    }
                }
            } else if ( both === DOWN ) {
                // move to the left
                if (( x - 1 ) >= 0 ) {
                    linearIndex = ( y * canvasWidth + ( x - 1 )) * 4;
                    if ( equalPixel( linearIndex )) {
                        found = true;
                        --x;
                    }
                }
            } else if ( both === RIGHT ) {
                // move down
                if (( y + 1 ) < canvasHeight ) {
                    linearIndex = (( y + 1 ) * canvasWidth + x ) * 4;
                    if ( equalPixel( linearIndex )) {
                        found = true;
                        ++y;
                    }
                }
            }
            if ( found ) {
                path.push({ x, y });
                break;
            }
        }
    }
    while( !( path[ path.length - 1 ].x === firstPoint.x && path[ path.length - 1 ].y === firstPoint.y ));

    // path calculated, fill inside

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
