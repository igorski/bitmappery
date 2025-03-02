/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
import type { Point, Viewport } from "zcanvas";
import type { CanvasContextPairing, Brush } from "@/definitions/editor";
import { hasSteppedLiveRender } from "@/definitions/brush-types";
import type ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";
import { createCanvas, setCanvasDimensions } from "@/utils/canvas-util";

export type OverrideConfig = {
    scale: number;
    zoom: number;
    vpX: number;
    vpY: number;
    pointers: Point[]
};

let tempCanvas: CanvasContextPairing;

// @todo rename this file and stuff like getTempCanvas() to make more sense 4 years down the line =)

/**
 * Lazily create / retrieve a low resolution canvas which can be used to render
 * low resolution content as a quick live preview measure.
 * The canvas will match the unzoomed viewport size.
 */
export const getTempCanvas = ( zoomableCanvas: ZoomableCanvas ): CanvasContextPairing => {
    // const { width, height } = zoomableCanvas.getViewport();
    const width = zoomableCanvas.getWidth();
    const height = zoomableCanvas.getHeight();
    if ( !tempCanvas ) {
        tempCanvas = createCanvas();
    }
    setCanvasDimensions( tempCanvas, width, height );
    return tempCanvas;
};

/**
 * Render the contents of the tempCanvas onto given destinationContext
 * using the scaling properties corresponding to given zoomableCanvas
 */
export const renderTempCanvas = ( zoomableCanvas: ZoomableCanvas, destinationContext: CanvasRenderingContext2D, viewport?: Viewport, offset?: Point ): void => {
    const { cvs } = tempCanvas;
    const scale   = zoomableCanvas.documentScale;

    destinationContext.drawImage(
        cvs, 0, 0, cvs.width, cvs.height,
        (( viewport?.left ?? 0 ) * scale ) + ( offset?.x ?? 0 ),
        (( viewport?.top ?? 0 ) * scale ) + ( offset?.y ?? 0 ), cvs.width * scale, cvs.height * scale
    );
};

/**
 * Dispose the current tempCanvas instance. It won't actually be removed, but
 * remains pooled for further use. It's size will however be reduced to
 * shrink its memory footprint.
 */
export const disposeTempCanvas = (): void => {
    if ( tempCanvas ) {
        setCanvasDimensions( tempCanvas, 1, 1 );
    }
};

/**
 * Slice a selection of pointers within a brush stroke for low res preview rendering.
 * This creates a deep copy of the pointers, leaving the original list unchanged.
 * This can be called in rendering iterations by supplying a positive value for
 * last (which indicates the offset of the last rendered pointer).
 */
export const slicePointers = ( brush: Brush ): Point[] => {
    const { pointers } = brush;
    const last = hasSteppedLiveRender( brush ) ? brush.last : undefined;
    return JSON.parse( JSON.stringify( pointers.slice( pointers.length - ( pointers.length - last ) - 1 )));
};

/**
 * Create override configuration for a render operation, adapting its
 * source input (e.g. pointers list) to scaling and coordinate space
 * of low res preview.
 *
 * @param {ZoomableCanvas} zoomableCanvas
 * @param {Number} x layer X offset
 * @param {Number} y layer Y offset
 * @param {Array<{ x: Number, y:Number }>} pointers
 * @return {Object}
 */
export const createOverrideConfig = ( zoomableCanvas: ZoomableCanvas, pointers: Point[] ): OverrideConfig => ({
    scale : 1 / zoomableCanvas.documentScale,
    zoom  : zoomableCanvas.zoomFactor,
    vpX   : zoomableCanvas.getViewport().left,
    vpY   : zoomableCanvas.getViewport().top,
    pointers,
});

/**
 * Apply a low res override configuration onto given point.
 * NOTE: This will mutate the original instance. Only use on entries
 * of translatePointers()
 *
 * @param {OverrideConfig} overrideConfig
 * @param {Point[]} pointers coordinates to transform
 */
export const applyOverrideConfig = ( overrideConfig: OverrideConfig, pointers: Point[] ): void => {
    const { vpX, vpY, scale } = overrideConfig;
    let i = pointers.length;
    while ( i-- )
    {
        const point = pointers[ i ];

        // correct for low res scaling

        point.x = point.x * scale;
        point.y = point.y * scale;

        // correct for viewport offset

        point.x -= vpX;
        point.y -= vpY;
    }
};
