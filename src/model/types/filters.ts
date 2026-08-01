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
import type { BlendModes } from "@/definitions/blend-modes";

type DuoToneFilter = {
    enabled: boolean;
    color1?: string;
    color2?: string;
};

type QuickFilter = {
    desaturate: boolean;
    invert: boolean;
    whiteBalance: boolean;
};

type HSLFilter = {
    hue: number, // -180 to +180 range (degrees)
    sat: number, // -1 to +1 range
    lightness: number, // -1 to +1 range
};

export type Filters = {
    enabled: boolean;
    blendMode: BlendModes;
    opacity: number;
    gamma: number;
    brightness: number;
    contrast: number;
    vibrance: number;
    threshold: number;
    quick: QuickFilter;
    duotone: DuoToneFilter;
    hsl: HSLFilter;
    blur: number;
};
