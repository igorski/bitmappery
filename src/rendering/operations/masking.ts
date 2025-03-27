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
import { type Size } from "zcanvas";
import type { CanvasContextPairing } from "@/definitions/editor";
import { createCanvas, setCanvasDimensions } from "@/utils/canvas-util";

let tempCanvas: CanvasContextPairing;

/**
 * Get a reference to a temporary Canvas used to make a composite of the
 * source layer and the mask layer while drawing (to be rendered above
 * the background for instant previewing purposes).
 */
export const getMaskComposite = ( size: Size ): CanvasContextPairing => {
    if ( !tempCanvas ) {
        tempCanvas = createCanvas( size.width, size.height );
    } else {
        setCanvasDimensions( tempCanvas, size.width, size.height );
    }
    return tempCanvas;
};

/**
 * Free memory allocated to the temporary Canvas. The Canvas will
 * remained pooled but by shrinking its size it will reduce memory usage.
 */
export const disposeMaskComposite = (): void => {
    if ( tempCanvas ) {
        setCanvasDimensions( tempCanvas, 1, 1 );
    }
};

/**
 * Apply a mask defined in provided mask property onto provided image source where
 * the output is drawn onto provided destinationContext.
 */
export const maskImage = (
    destinationContext: CanvasRenderingContext2D, source: HTMLCanvasElement, mask: HTMLCanvasElement,
    sourceWidth: number, sourceHeight: number, maskOffsetX = 0, maskOffsetY = 0
): void => {
    destinationContext.clearRect( 0, 0, sourceWidth, sourceHeight );
    destinationContext.drawImage( source, 0, 0 );

    destinationContext.save();

    destinationContext.globalCompositeOperation = "destination-out";
    destinationContext.drawImage( mask, maskOffsetX, maskOffsetY );
    
    destinationContext.restore();
};
