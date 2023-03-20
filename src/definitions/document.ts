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
import type { Point } from "zcanvas";
import type { LayerTypes } from "./layer-types";

export type Layer = {
    id: string;
    name: string;
    type: LayerTypes;
    left: number;
    top: number;
    maskX: number;
    maskY: number;
    width: number;
    height: number;
    visible: boolean;
    transparent: boolean;
    source?: HTMLCanvasElement;
    mask?: HTMLCanvasElement;
    effects: Effects;
    filters: Filters;
    text: Text;
};

export type Effects = {
    scale: number;
    rotation: number;
    mirrorX: boolean;
    mirrorY: boolean;
};

export type Filters = {
    enabled: boolean;
    opacity: number;
    gamma: number;
    brightness: number;
    contrast: number;
    vibrance: number;
    desaturate: boolean;
};

export type Text = {
    value: string;
    font: string;
    size: number;
    unit: string;
    lineHeight: number;
    spacing: number;
    color: string;
};

export type Selection = Point[];

export type Document = {
    id: string;
    name: string;
    layers: Layer[];
    width: number;
    height: number;
    selections: Record<string, Selection>,
    // the below are only used at runtime, will not be serialized
    selection: null | Selection;
    invertSelection: boolean;
};
