/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
import type { Text } from "@/definitions/document";
import { fastRound } from "@/math/unit-math";

type MeasuredLineDef = {
    line: string;
    top: number;
};

/**
 * Renders a Layers text Object as multi line text onto given context.
 */
export const renderMultiLineText = ( ctx: CanvasRenderingContext2D, text: Text ): void => {
    // calculate bounding box and offsets for all lines in the text
    const { lines, width, height } = measureLines( text.value.split( "\n" ), text, ctx );

    // size canvas to bounding box
    ctx.canvas.width  = width;
    ctx.canvas.height = height;

    applyTextStyleToContext( text, ctx );

    lines.forEach(({ line, top }) => {
        if ( !text.spacing ) {
            // write entire line (0 spacing defaults to font spacing)
            ctx.fillText( line, 0, top );
        } else {
            // write letter by letter (yeah... this is why we cache things)
            const letters = line.split( "" );
            letters.forEach(( letter, letterIndex ) => {
                ctx.fillText( letter, fastRound( letterIndex * text.spacing ), top );
            });
        }
    });
};

/* internal methods */

/**
 * Measure the bounding box occupied by given lines of text for given text properties
 *
 * @param {string[]} lines of text to render
 * @param {Object} text Layer text Object
 * @param {CanvasRenderingContext2D} ctx
 * @return {{ lines: MeasuredLineDef[], width: Number, height: Number }} bounding box of the rendered text
 */
function measureLines( lines: string[], text: Text, ctx: CanvasRenderingContext2D ):
    { lines: MeasuredLineDef[], width: number, height: number } {
    applyTextStyleToContext( text, ctx );

    const linesOut: MeasuredLineDef[] = [];
    let width  = 0;
    let height = 0;

    let lineHeight  = text.lineHeight;
    let textMetrics = ctx.measureText( "Wq" );
    // if no custom line height was given, calculate optimal height for font
    if ( !lineHeight ) {
        lineHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    }
    const topOffset = textMetrics.actualBoundingBoxAscent;
    let top = 0;

    lines.forEach(( line, lineIndex ) => {
        top = fastRound( topOffset + ( lineIndex * lineHeight ));
        if ( !text.spacing ) {
            textMetrics = ctx.measureText( line );
            width = Math.max( width, textMetrics.actualBoundingBoxRight );
        } else {
            const letters = line.split( "" );
            width = Math.max( width, letters.length * text.spacing );
        }
        linesOut.push({ line, top });
        height += lineHeight;
    });
    return {
        lines  : linesOut,
        width  : Math.ceil( width ),
        height : Math.ceil( height )
    };
}

function applyTextStyleToContext( text: Text, ctx: CanvasRenderingContext2D ): void {
    ctx.font      = `${text.size}${text.unit} "${text.font}"`;
    ctx.fillStyle = text.color;
}
