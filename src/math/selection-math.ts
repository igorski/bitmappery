/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
import type { Shape } from "@/definitions/document";

const UP     = 0;
const LEFT   = 1;
const DOWN   = 2;
const RIGHT  = 3;

/**
 * @param {HTMLCanvasElement} cvs
 * @param {number} sourceX
 * @param {number} sourceY
 * @param {number=} threshold in 0 - 100 range
 * @return {Shape}
 */
export const selectByColor = ( cvs: HTMLCanvasElement, sourceX: number, sourceY: number, threshold = 0 ): Shape => {
    const { width, height } = cvs;

    const ctx = cvs.getContext( "2d" );

    sourceX = Math.min( width  - 1, Math.round( sourceX ));
    sourceY = Math.min( height - 1, Math.round( sourceY ));

    // the source color
    // @ts-expect-error can only be iterated with es2015 or higher --target
    const [ r, g, b, a ] = ctx.getImageData( sourceX, sourceY, 1, 1 ).data;

    const imageData = ctx.getImageData( 0, 0, width, height ).data;

    // verification whether pixel starting at given index is of equal color as the source color, or within range
    const pixelMatch = ( index: number ): boolean => {
        // exact color  match
        if ( threshold === 0 ) {
            return imageData[ index ]     === r &&
                   imageData[ index + 1 ] === g &&
                   imageData[ index + 2 ] === b &&
                   imageData[ index + 3 ] === a;
       }
       // within color distance
       const rMean = ( r + imageData[ index ] ) / 2;
       const r2 = r - imageData[ index ];
       const g2 = g - imageData[ index + 1 ];
       const b2 = b - imageData[ index + 2 ];

       const distance = Math.sqrt(
           ((( 512 + rMean ) * r2 * r2 ) >> 8 ) +
           4 * g2 * g2 +
           ((( 767 - rMean ) * b2 * b2 ) >> 8 )
       );
       return distance < threshold;
    };

    // traverse up in the image to find a boundary (e.g. where color is different to the source)
    let x = sourceX;
    let y = sourceY;

    // linearIndex is the first index inside the imageData Array for the compare point
    // (note each point spans 4 indices for each color in the RGBA sequence)

    let linearIndex = ( y * width + x ) * 4;
    while ( y >= 0 ) {
        const newLinearIndex = (( y - 1 ) * width + x ) * 4;
        if ( pixelMatch( newLinearIndex )) {
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
                if (( x + 1 ) < width ) {
                    linearIndex = ( y * width + ( x + 1 )) * 4;
                    if ( pixelMatch( linearIndex )) {
                        found = true;
                        ++x;
                    }
                }
            } else if ( both === LEFT ) {
                // move up
                if (( y - 1 ) >= 0 ) {
                    linearIndex = (( y - 1 ) * width + x ) * 4;
                    if ( pixelMatch( linearIndex )) {
                        found = true;
                        --y;
                    }
                }
            } else if ( both === DOWN ) {
                // move to the left
                if (( x - 1 ) >= 0 ) {
                    linearIndex = ( y * width + ( x - 1 )) * 4;
                    if ( pixelMatch( linearIndex )) {
                        found = true;
                        --x;
                    }
                }
            } else if ( both === RIGHT ) {
                // move down
                if (( y + 1 ) < height ) {
                    linearIndex = (( y + 1 ) * width + x ) * 4;
                    if ( pixelMatch( linearIndex )) {
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

    return path;
};
