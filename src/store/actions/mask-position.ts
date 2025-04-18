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
import { getRendererForLayer } from "@/factories/renderer-factory";
import { enqueueState } from "@/factories/history-state-factory";

export function positionMask( layer: Layer, newMaskX: number, newMaskY: number ): void {
    const { maskX, maskY } = layer;

    const commit = (): void => {
        layer.maskX = newMaskX;
        layer.maskY = newMaskY;
        getRendererForLayer( layer )?.resetFilterAndRecache();
    };
    commit();
    
    enqueueState( `maskPos_${layer.id}`, {
        undo(): void {
            layer.maskX = maskX;
            layer.maskY = maskY;
            getRendererForLayer( layer )?.resetFilterAndRecache();
        },
        redo: commit
    });
}