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
import { type Filters } from "@/model/types/filters";

export const MAX_BLUR = 50;

export const MIN_EXPOSURE = -3;
export const MAX_EXPOSURE = 3;

/**
 * Maps the normalised values for Filters to scaled
 * values which can be used by the filter process
 */
export const getValue = ( filters: Filters, prop: keyof Filters ): any => {
    switch ( prop ) {
        default:
            return filters[ prop ];
        case "brightness":
            return filters.brightness * 2;
        case "contrast":
            return Math.pow((( filters.contrast * 100 ) + 100 ) / 100, 2 );
        case "exposure":
            return mapRange( filters.exposure, 0, 1, MIN_EXPOSURE, MAX_EXPOSURE );
        case "gamma":
            return filters.gamma * 2;
        case "vibrance":
            return -(( filters.vibrance * 200 ) - 100 ); // becomes inversed normalised 100 to -100 range
    }
};
