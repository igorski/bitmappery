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
import { type Store } from "vuex";
import ToolTypes, { MIN_ZOOM, MAX_ZOOM } from "@/definitions/tool-types";
import { type BitMapperyState } from "@/store";

const ZOOM_INCREMENT = 1 / 10;

export const zoomIn = ( store: Store<BitMapperyState> ): void => {
    store.commit( "setToolOptionValue",
        { tool: ToolTypes.ZOOM, option: "level", value: Math.min( MAX_ZOOM, store.getters.zoomOptions.level + ( MAX_ZOOM * ZOOM_INCREMENT ))
    });
};

export const zoomOut = ( store: Store<BitMapperyState> ): void => {
    store.commit( "setToolOptionValue",
        { tool: ToolTypes.ZOOM, option: "level", value: Math.max( MIN_ZOOM, store.getters.zoomOptions.level - ( MAX_ZOOM * ZOOM_INCREMENT ))
    });
};
