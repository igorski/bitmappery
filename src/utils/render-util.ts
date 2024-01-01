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
import type { IRenderer, StrokeProps } from "zcanvas";
import type { Layer } from "@/definitions/document";
import { LayerTypes } from "@/definitions/layer-types";
import { resizeImage } from "@/utils/canvas-util";

export const renderCross = ( renderer: IRenderer, x: number, y: number, size: number, stroke: StrokeProps ): void => {
    renderer.drawPath([ { x: x - size, y: y - size }, { x: x + size, y: y + size }], undefined, stroke );
    renderer.drawPath([ { x: x + size, y: y - size }, { x: x - size, y: y + size }], undefined, stroke );
};

export const resizeLayerContent = async ( layer: Layer, ratioX: number, ratioY: number ): Promise<void> => {
    const { source, mask } = layer;

    layer.source = await resizeImage( source, source.width * ratioX, source.height * ratioY );
    if ( mask ) {
        layer.mask = await resizeImage( mask, mask.width * ratioX, mask.height * ratioY );
        layer.maskX *= ratioX;
        layer.maskY *= ratioY;
    }
    layer.left   *= ratioX;
    layer.top    *= ratioY;
    layer.width  *= ratioX;
    layer.height *= ratioY;

    if ( layer.type === LayerTypes.LAYER_TEXT ) {
        const { text } = layer;

        text.size       *= ratioX;
        text.spacing    *= ratioX;
        text.lineHeight *= ratioY;
    }
};

export const cropLayerContent = async ( layer: Layer, left: number, top: number ): Promise<void> => {
    /*
    if ( layer.mask ) {
        // no, mask coordinates are relative to layer
        layer.maskX -= left;
        layer.maskY -= top;
    }
    */
    layer.left -= left;
    layer.top  -= top;
};
