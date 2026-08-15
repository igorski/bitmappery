/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
import { mapRange } from "@/math/unit-math";
import { type Text } from "@/model/types/text";

const MIN_LINE_HEIGHT_FACTOR = -4;
const MAX_LINE_HEIGHT_FACTOR = 4;
const MIN_SPACING_FACTOR = -4;
const MAX_SPACING_FACTOR = 4;

/**
 * Maps the normalised model values for Text to scaled value ranges which
 * correspond with the parameters used by the respective text process.
 */
export const denormalise = ( text: Text, prop: keyof Text ): any => {
    switch ( prop ) {
        default:
            return text[ prop ];
        case "lineHeight":
            return mapRange( text[ prop ], 0, 1, MIN_LINE_HEIGHT_FACTOR, MAX_LINE_HEIGHT_FACTOR );
        case "spacing":
            return mapRange( text[ prop ], 0, 1, MIN_SPACING_FACTOR, MAX_SPACING_FACTOR );
    }
};

/**
 * Inverse of denormalise(), use when UI values for Text properties need
 * to be mapped to their model values
 */
export const normalise = ( prop: keyof Text, value: any ): any => {
    switch ( prop ) {
        default:
            return value;
        case "lineHeight":
            return mapRange( value, MIN_LINE_HEIGHT_FACTOR, MAX_LINE_HEIGHT_FACTOR, 0, 1 );
        case "spacing":
            return mapRange( value, MIN_SPACING_FACTOR, MAX_SPACING_FACTOR, 0, 1 );
    }
};