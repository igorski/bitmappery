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
import { type Layer } from "@/model/types/layer";
import { type IChangeSource, onLayerPropertiesChange } from "@/model/actions/layer-properties-change";
import { enqueueState } from "@/model/factories/history-state-factory";

export function positionMask( layer: Layer, newLeft: number, newTop: number ): void {
    const oldLeft = layer.mask.left;
    const oldTop  = layer.mask.top;
    
    const sources = [ "maskX", "maskY" ] as IChangeSource[];

    const commit = (): void => {
        layer.mask.left = newLeft;
        layer.mask.top = newTop;
        onLayerPropertiesChange( layer, { sources });
    };
    commit();
    
    enqueueState( `maskPos_${layer.id}`, {
        undo(): void {
            layer.mask.left = oldLeft;
            layer.mask.top = oldTop;
            onLayerPropertiesChange( layer, { sources });
        },
        redo: commit
    });
}