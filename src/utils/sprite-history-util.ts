/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
import { type Layer } from "@/definitions/document";
import { getSpriteForLayer } from "@/factories/sprite-factory";

// NOTE we use getSpriteForLayer() instead of passing the Sprite by reference
// as it is possible the Sprite originally rendering the Layer has been disposed
// and a new one has been created while traversing the change history

export function positionSpriteFromHistory( layer: Layer, x: number, y: number ): void {
    const sprite = getSpriteForLayer( layer );
    if ( sprite ) {
        sprite.getBounds().left = x;
        sprite.getBounds().top  = y;
        sprite.invalidate();
    }
}

export function restorePaintFromHistory( layer: Layer, state: string, isMask: boolean ): void {
    const source = isMask ? layer.mask : layer.source;
    const ctx = source.getContext( "2d" ) as CanvasRenderingContext2D;
    ctx.clearRect( 0, 0, source.width, source.height );
    const image  = new Image();
    image.onload = () => {
        ctx.drawImage( image, 0, 0 );
        getSpriteForLayer( layer )?.resetFilterAndRecache();
    };
    image.src = state;
}
