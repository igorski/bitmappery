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
import type { Point, Size } from "zcanvas";
import type BrushTypes from "@/definitions/brush-types";
import type { Selection, SelectionList } from "@/definitions/document";

export type Notification = {
    title: string;
    message: string;
};

export type Dialog = {
    type: "info";
    title: string;
    message: string;
    link?: string;
    confirm?: () => void;
    cancel?: () => void;
};

export type CanvasContextPairing = {
    cvs: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
};

// technically a more limited version of "CanvasImageSource", these are the only
// data types handled internally by BitMappery as the canvas source content
export type CanvasDrawable = HTMLCanvasElement | HTMLImageElement;

export type CanvasDimensions = {
    // the base dimensions describe the "best fit" scale to represent
    // the currently active document at the current window size, this
    // is basically the baseline used for the unzoomed document view
    width         : number;
    height        : number;
    // the visible area of the canvas (as it is positioned inside a container
    // that offers scrollable overflow)
    visibleWidth  : number;
    visibleHeight : number;
    // the maximum in- and out zoom level supported for the currently
    // open document at the current available screen dimensions
    maxInScale    : number;
    maxOutScale   : number;
    // whether the unzoomed images horizontal side is the dominant side (e.g. fills
    // the full width of the visible canvas area)
    horizontalDominant : boolean;
};

export type CanvasZoomRange = {
    zeroZoomWidth: number;
    zeroZoomHeight: number;
    minZoomWidth: number;
    minZoomHeight: number;
    pixelsPerZoomOutUnit: number;
    maxZoomWidth: number;
    maxZoomHeight: number;
    pixelsPerZoomInUnit: number;
};

export type Brush = {
    radius: number;
    halfRadius: number;
    doubleRadius: number;
    colors: string[];
    pointers: Point[];
    options: any,
    down: boolean;
    last?: number;
};

export type BrushAction = {
    type: string;
    size: number;
    color: string;
    selection: SelectionList;
};

export type ZoomToolOptions = {
    level: number;
};

export type BrushToolOptions = {
    size: number;
    type: BrushTypes;
    opacity: number;
    strokes: number;
    thickness: number;
};

export type EraserToolOptions = {
    size: number;
    type: BrushTypes;
    opacity: number;
    thickness: number;
};

export type CloneToolOptions = {
    size: number;
    type: BrushTypes;
    opacity: number;
    sourceLayerId: string;
    coords: Point;
    thickness: number;
};

export type SelectionToolOptions = {
    lockRatio: boolean;
    xRatio: number;
    yRatio: number;
};

export type FillToolOptions = {
    smartFill: boolean;
};

export type WandToolOptions = {
    threshold: number;
    sampleMerged: boolean;
};
