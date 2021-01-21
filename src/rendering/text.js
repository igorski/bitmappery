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
import { fastRound } from "@/math/image-math";

/**
 * Renders a Layers text Object as multi line text onto given context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} text Layer text Object
 * @return {{ width: Number, height: Number }} bounding box of the rendered text
 */
export const renderMultiLineText = ( ctx, text ) => {
    // calculate bounding box and offsets for all lines in the text
    const { lines, width, height } = measureLines( text.value.split( "\n" ), text, ctx );

    // size canvas to bounding box
    ctx.canvas.width  = width;
    ctx.canvas.height = height;

    applyTextStyleToContext( text, ctx );

    lines.forEach(({ line, y }, lineIndex ) => {
        if ( !text.spacing ) {
            // write entire line (0 spacing defaults to font spacing)
            ctx.fillText( line, 0, y );
        } else {
            // write letter by letter (yeah... this is why we cache things)
            const letters = line.split( "" );
            letters.forEach(( letter, letterIndex ) => {
                ctx.fillText( letter, fastRound( letterIndex * text.spacing ), y );
            });
        }
    });
};

/* internal methods */

function measureLines( lines, text, ctx ) {
    applyTextStyleToContext( text, ctx );

    const linesOut = [];
    let width  = 0;
    let height = 0;

    let lineHeight  = text.lineHeight;
    let textMetrics = ctx.measureText( "Wq" );
    // if no custom line height was given, calculate optimal height for font
    if ( !lineHeight ) {
        lineHeight = text.size + Math.abs( textMetrics.actualBoundingBoxDescent );
    }
    const yStartOffset = textMetrics.actualBoundingBoxAscent;
    let y = 0;

    lines.forEach(( line, lineIndex ) => {
        y = fastRound( yStartOffset + ( lineIndex * lineHeight ));
        if ( !text.spacing ) {
            textMetrics = ctx.measureText( line );
            width = Math.max( width, textMetrics.actualBoundingBoxRight );
        } else {
            const letters = line.split( "" );
            width = Math.max( width, letters.length * text.spacing );
        }
        linesOut.push({ line, y });
        height += lineHeight;
    });
    return {
        lines  : linesOut,
        width  : Math.ceil( width ),
        height : Math.ceil( height )
    };
}

function applyTextStyleToContext( text, ctx ) {
    ctx.font      = `${text.size}px ${text.font}`;
    ctx.fillStyle = text.color;
};
