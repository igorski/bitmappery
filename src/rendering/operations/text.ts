/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2026 - https://www.igorski.nl
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
import { denormalise } from "@/definitions/text-properties";
import type { Text } from "@/model/types/text";
import { fastRound } from "@/math/unit-math";

type TextLetterProps = {
    letter: string;
    x: number;
};

type TextLineProps = {
    letters: TextLetterProps[];
    width: number;
    top: number;
};

type MeasuredLineDef = {
    lines: TextLineProps[],
    width: number;
    height: number;
};

/**
 * Renders a Layers text Object as multi line text onto given context.
 */
export const renderMultiLineText = ( ctx: CanvasRenderingContext2D, text: Text ): void => {
    // calculate bounding box and offsets for all lines in the text
    const measuredLines = measureLines( text.value.split( "\n" ), text, ctx );

    const { lines, width, height } = measuredLines;

    // size canvas to bounding box
    ctx.canvas.width  = width;
    ctx.canvas.height = height;

    applyTextStyleToContext( text, ctx );

    lines.forEach(({ letters, top }) => {
        // render letter by letter (yeah... this is why we cache things)
        letters.forEach(({ letter, x }) => {
            ctx.fillText( letter, fastRound( x ), fastRound( top ));
        });
    });
};

/* internal methods */

/**
 * Measure the bounding box occupied by given lines of text for given text properties
 *
 * @param {string[]} lines of text to render
 * @param {Object} text Layer text Object
 * @param {CanvasRenderingContext2D} ctx
 * @return {MeasuredLineDef} bounding box of the rendered text
 */
function measureLines( lines: string[], text: Text, ctx: CanvasRenderingContext2D ): MeasuredLineDef {
    applyTextStyleToContext( text, ctx );

    const linesOut: TextLineProps[] = [];

    let width = 0;
    let height = 0;
    let textMetrics: TextMetrics;

    // precalculate horizontal properties

    textMetrics = ctx.measureText( "W" );
    const horizontalLetterGapScaling = denormalise( text, "spacing" );
    
    // precalculate vertical properties

    textMetrics = ctx.measureText( "Wq" );
    const fontHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    const verticalLineGapScaling = denormalise( text, "lineHeight" );
    const lineHeight = fontHeight * verticalLineGapScaling;

    const naturalTotalHeight = lines.length * fontHeight;
    const targetBlockHeight = naturalTotalHeight * verticalLineGapScaling; 
    
    const totalExtraVerticalSpace = targetBlockHeight - naturalTotalHeight;
    const verticalLineGap = lines.length > 1 ? ( totalExtraVerticalSpace / ( lines.length - 1 )) : 0;

    let top = textMetrics.actualBoundingBoxAscent;

    lines.forEach( line => {
        let letters: TextLetterProps[];
        let currentLineWidth = 0;

        const naturalLineMetrics = ctx.measureText( line );
        const naturalLineWidth = naturalLineMetrics.width;

        if ( horizontalLetterGapScaling === 1 || line.length <= 1 ) {
            letters = [ { letter: line, x: 0 }]; // writes entire string without alternate spacing
            currentLineWidth = naturalLineWidth;
        } else {
            currentLineWidth = naturalLineWidth * horizontalLetterGapScaling;

            const totalExtraSpace = currentLineWidth - naturalLineWidth;
            const horizontalGapPerLetter = totalExtraSpace / ( line.length - 1 );

            let currentX = 0;
            
            letters = line.split( "" ).map( letter => {
                const x = currentX;

                const letterWidth = ctx.measureText( letter ).width;
                currentX += letterWidth + horizontalGapPerLetter;
                     
                return { letter, x };
            });
        }
        linesOut.push({ letters, top, width: currentLineWidth });

        width = Math.max( width, currentLineWidth );
        height += lineHeight;

        top += fontHeight + verticalLineGap;
    });

    // apply alignment

    const { alignment } = text;

    if ( alignment !== "left" ) {
        linesOut.forEach( line => {
            let alignOffset = 0;
            if ( text.alignment === "center" ) {
                alignOffset = ( width - line.width ) / 2;
            } else if ( text.alignment === "right" ) {
                alignOffset = width - line.width;
            }

            if ( alignOffset > 0 ) {
                line.letters = line.letters.map( letter => ({
                    ...letter,
                    x: letter.x + alignOffset
                }));
            }
        });
    }
    
    return {
        lines  : linesOut,
        width  : Math.max( 1, Math.ceil( width )),
        height : Math.max( 1, Math.ceil( height )),
    };
}

function applyTextStyleToContext( text: Text, ctx: CanvasRenderingContext2D ): void {
    ctx.font      = `${text.size}${text.unit} "${text.font}"`;
    ctx.fillStyle = text.color;
}
