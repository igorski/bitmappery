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
import type { LayerTypes } from "@/definitions/layer-types";
import type { Filters } from "@/model/types/filters";
import type { Text } from "@/model/types/text";
import type { Transform } from "@/model/types/transform";

/**
 * Identifier for related entites
 */
export type RelId = string | number;

/**
 * A LayerRel describes whether the Layer is related
 * to another entity (like a Layer- or Tile Group)
 */
export type LayerRel = {
    type: "none" | "group" | "tile";
    id?: RelId;
};

/**
 * Properties of the Layer structure.
 * The Layer is what holds the content (image, text, etc.)
 */
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
    transform: Transform;
    filters: Filters;
    text: Text;
    rel: LayerRel;
};