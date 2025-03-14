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
import { type Layer } from "@/definitions/document";

interface BlendedLayerCache {
    enabled: boolean;   // whether blend caching is enabled for the current Document
    paused: boolean;    // whether blend caching is paused (for instance during mutations of layers inside the blended content)
    index: number;      // index of layer containing the blended content
    bitmap?: HTMLCanvasElement; // cached Bitmap
    blendableLayers?: number[]; // indices of all layers to render in the blend (up to and including the layer defined at the cache index)
};

const blendCache: BlendedLayerCache = {
    enabled: false,
    paused: false,
    index: -1,
    bitmap: undefined,
    blendableLayers: undefined,
};

export const useBlendCaching = (): boolean => !blendCache.paused && blendCache.enabled;

export const setBlendCaching = ( value: boolean, blendableLayers?: Layer[] ): void => {
    blendCache.enabled = value;
    if ( !value ) {
        blendCache.index = -1;
    }
    blendCache.blendableLayers = blendableLayers?.map(( _layer, index ) => index );
};

export const getBlendableLayers = (): number[] | undefined => {
    return blendCache.blendableLayers;
};

/**
 * Whether the layer at provided index is part of the blended layer cache. Note that
 * excludes the index of the layer that has the cached blend. This is for easy diffing
 * and cache generation purposes (see LayerSprite#draw())
 * 
 * In other words, this function determines whether the provided index is of a layer below
 * the highest layer that has a cached blend mode applied.
 */
export const isBlendCached = ( index: number ): boolean => {
    return index < blendCache.index;
};

export const pauseBlendCaching = ( index: number, paused: boolean ): void => {
    const isCached = blendCache.index === index || isBlendCached( index );
    if ( !isCached ) {
        return;
    }
    const wasPaused = blendCache.paused;
    blendCache.paused = paused;

    if ( wasPaused && !paused ) {
        flushBlendedLayerCache();
    }
};

/**
 * Retrieve the cached bitmap corresponding to the layer at provided index.
 * When existing, the bitmap will return the contents of the layer as well as that
 * of all underlying layers. Note: if the Layer at provided index has a blend mode filter
 * but no cached bitmap, it means a Layer w/blend mode filter at a higher index owns the cache.
 */
export const getBlendCache = ( index: number ): HTMLCanvasElement | undefined => {
    if ( blendCache.index !== index ) {
        return;
    }
    return blendCache.bitmap;
};

/**
 * Cache provided bitmap and associate its ownership with the layer at the provided index.
 * If a subsequent invocation for a layer at a higher index is provided, this is fine
 * as an underlying layer with its own blended context would be cached within the higher layers bitmap.
 */
export const cacheBlendedLayer = ( index: number, bitmap: HTMLCanvasElement ): void => {
    blendCache.index  = index;
    blendCache.bitmap = bitmap;
};

/**
 * Clear the existing blend cache bitmap so it can be regenerated on next render.
 * When requesting a full flush, the blend layer index is also unset.
 * Note this does not unset the enabled state so LayerSprites can take appropriate action upon next render.
 */
export const flushBlendedLayerCache = ( full = false ): void => {
    if ( full ) {
        blendCache.index = -1;
    }
    blendCache.bitmap = undefined;
};
