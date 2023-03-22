/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
import type { Module } from "vuex";
import type { CanvasDimensions } from "@/definitions/editor";

export interface CanvasState {
    canvasDimensions: CanvasDimensions;
};

export const createCanvasState = ( props?: Partial<CanvasState> ): CanvasState => ({
    canvasDimensions: {
        width         : 0,
        height        : 0,
        visibleWidth  : 0,
        visibleHeight : 0,
        maxInScale    : 1,
        maxOutScale   : 1,
        horizontalDominant : false,
        ...props?.canvasDimensions
    },
    ...props
});

const CanvasModule: Module<CanvasState, any> = {
    state: (): CanvasState => createCanvasState(),
    getters: {
        canvasDimensions: ( state: CanvasState ): CanvasDimensions => state.canvasDimensions,
    },
    mutations: {
        setCanvasDimensions( state: CanvasState, { width, height, horizontalDominant, visibleWidth, visibleHeight, maxInScale, maxOutScale }: CanvasDimensions ) {
            Vue.set(
                state,
                "canvasDimensions",
                { width, height, horizontalDominant, visibleWidth, visibleHeight, maxInScale, maxOutScale }
            );
        },
    },
};
export default CanvasModule;
