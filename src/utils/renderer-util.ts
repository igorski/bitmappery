/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
import type { sprite, Rectangle, Viewport } from "zcanvas";

export const isInsideViewport = ({ left, top, width, height }: Rectangle, viewport: Viewport ): boolean => {
    return ( left + width )  >= viewport.left && left <= viewport.right &&
           ( top  + height ) >= viewport.top  && top  <= viewport.bottom;
};

/**
 * Programmatically force a pointer down event on the provided renderer
 */
export const pointerDown = ( renderer?: sprite, x = 0, y = 0 ): void => {
    renderer?.setInteractive( true );
    renderer?.handleInteraction( x, y, new PointerEvent( "mousedown" ));
};

/**
 * Programmatically force a pointer up event on the provided renderer
 */
export const pointerUp = ( renderer?: sprite, x = 0, y = 0 ): void => {
    renderer?.handleInteraction( x, y, new PointerEvent( "mouseup" ));
};
