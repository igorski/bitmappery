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
const BrushTypes = {
    LINE           : "0",
    PAINT_BRUSH    : "1",
    PEN            : "2",
    CALLIGRAPHIC   : "3",
    CONNECTED      : "4",
    NEAREST        : "5",
    SPRAY          : "6",
};
export default BrushTypes;

const NON_STEPPABLE_TYPES = [ BrushTypes.CONNECTED, BrushTypes.NEAREST ];

/**
 * For low-res live rendering purposes, brushes can be rendered
 * in iterations. However some require their full path to be present
 * in a single render iteration.
 *
 * @param {Object} brush @see brush-factory
 */
export const hasSteppedLiveRender = ({ options }) => !NON_STEPPABLE_TYPES.includes( options.type );
