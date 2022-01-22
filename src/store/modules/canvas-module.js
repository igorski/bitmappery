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
import Vue from "vue";

export default {
    state: {
        canvasDimensions: {
            // the base dimensions describe the "best fit" scale to represent
            // the currently active document at the current window size, this
            // is basically the baseline used for the unzoomed document view
            width         : 0,
            height        : 0,
            // the visible area of the canvas (as it is positioned inside a container
            // that offers scrollable overflow)
            visibleWidth  : 0,
            visibleHeight : 0,
            // the maximum in- and out zoom level supported for the currently
            // open document at the current available screen dimensions
            maxInScale    : 1,
            maxOutScale   : 1,
        },
    },
    getters: {
        canvasDimensions: state => state.canvasDimensions,
    },
    mutations: {
        setCanvasDimensions( state, { width, height, visibleWidth, visibleHeight, maxInScale, maxOutScale }) {
            Vue.set( state, "canvasDimensions", { width, height, visibleWidth, visibleHeight, maxInScale, maxOutScale });
        },
    },
};
