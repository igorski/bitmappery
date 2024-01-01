/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
import { Sprite } from "zcanvas";
import type { Rectangle, Viewport, IRenderer, StrokeProps } from "zcanvas";
import { fastRound } from "@/math/unit-math";
import type ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";
import { getClosestSnappingPoints } from "@/rendering/snapping";

const AMOUNT_OF_PIXELS = 1; // currently only 1 pixel grid supported

class GuideRenderer extends Sprite  {
    private drawGuides: boolean;
    private drawPixelGrid: boolean;
    private strokeProps: StrokeProps = { color: "#FFF", size: 1 };

    constructor( zCanvasInstance: ZoomableCanvas = null ) {
        // @ts-expect-error ignoring some arguments...
        super({ interactive: false });
        zCanvasInstance?.addChild( this );
    }

    /* public methods */

    stayOnTop(): void {
        const zCanvas = this.canvas;
        zCanvas?.removeChild( this );
        zCanvas?.addChild( this );
    }

    setModes( drawGuides: boolean, drawPixelGrid: boolean ): void {
        this.drawGuides    = drawGuides;
        this.drawPixelGrid = drawPixelGrid;
    }

    override draw( renderer: IRenderer, viewport?: Viewport ): void {

        const canvas = this.canvas as ZoomableCanvas;

        this.strokeProps.color = "#000";
        this.strokeProps.size  = 1 / canvas.zoomFactor;

        /* grid */

        if ( this.drawPixelGrid ) {
            const width  = viewport?.width  || canvas.getWidth();
            const height = viewport?.height || canvas.getHeight();

            // @todo cache the points ?

            for ( let x = 0; x < width; x += AMOUNT_OF_PIXELS ) {
                renderer.drawPath([ { x, y: 0 }, { x, y: height }], undefined, this.strokeProps );
            }
            for ( let y = 0; y < height; y += AMOUNT_OF_PIXELS ) {
                renderer.drawPath([ { x: 0, y }, { x: width, y }], undefined, this.strokeProps );
            }
        }

        /* guides */

        if ( !this.drawGuides || !canvas.guides || !canvas.draggingSprite ) {
            return;
        }

        const vpLeft = viewport?.left || 0;
        const vpTop  = viewport?.top  || 0;

        // we can snap the currently draggingSprite against its edge and center
        const guides: Rectangle[] = getClosestSnappingPoints( canvas.draggingSprite, canvas.guides );

        this.strokeProps.color = "red";

        for ( const { left, top, width, height } of guides ) {
            // make up for canvas viewport offset
            const localX = left - vpLeft;
            const localY = top - vpTop;

            renderer.drawPath([
                { x: fastRound( localX ), y: fastRound( localY ) },
                { x: fastRound( localX + width ), y: fastRound( localY + height ) }
            ], undefined, this.strokeProps );
        }
    }
}
export default GuideRenderer;
