/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2025 - https://www.igorski.nl
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
interface BlendedLayerCache {
    index: number; // index of layer containing the blended content
    bitmap?: HTMLCanvasElement; // cached Bitmap
};

const blendCache: BlendedLayerCache = {
    index: -1,
    bitmap: undefined,
};

/**
 * Whether the layer at provided index is part of the blended layer cache.
 * In other words: is a layer below the highest layer with a blend mode applied.
 */
export const isBlendCached = ( index: number ): boolean => {
    return index < blendCache.index;
};

/**
 * Retrieve the cached bitmap corresponding to the layer at provided index.
 * When existing, the bitmap will return the contents of the layer as well as that
 * of all underlying layers.
 */
export const getBlendCache = ( index: number ): HTMLCanvasElement | undefined => {
    if ( blendCache.index !== index ) {
        return;
    }
    return blendCache.bitmap;
};

/**
 * Cache provided bitmap and associated it with the layer at the provided index.
 * If a subsequent invocation for a layer at a higher index is provided, this would be fine
 * as an underlying layer with its own blended context, would be cached in the higher layers bitmap.
 */
export const cacheBlendedLayer = ( index: number, bitmap: HTMLCanvasElement ): void => {
    blendCache.index  = index;
    blendCache.bitmap = bitmap;
};

/**
 * Clear the existing blend cache.
 */
export const flushBlendedLayerCache = (): void => {
    console.info('clearBlendCache')
    blendCache.index  = -1;
    blendCache.bitmap = undefined;
};