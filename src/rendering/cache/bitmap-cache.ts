/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
import type { Layer, Filters, Text } from "@/definitions/document";

export type RenderCache = {
    text?: Text;
    textBitmap?: HTMLCanvasElement;
    filters?: Filters;
    filterData?: ImageData;
};

const layerCache: Map<string, RenderCache> = new Map();

export const getLayerCache = ( layer: Layer ): RenderCache => layerCache.get( layer.id );

export const setLayerCache = ( layer: Layer, props: RenderCache ): void => {
    const cache = getLayerCache( layer ) ?? {};
    layerCache.set( layer.id, { ...cache, ...props });
};

export const hasLayerCache = ( layer: Layer ): boolean => layerCache.has( layer.id );

export const clearCacheProperty = ( layer: Layer, propertyName: string ): void => {
    const cache = getLayerCache( layer );
    // @ts-expect-error using string as key
    if ( cache?.[ propertyName ] ) {
        // @ts-expect-error using string as key
        delete cache[ propertyName ];
    }
};

export const flushLayerCache = ( layer: Layer ): void => {
    //console.info( "flushing bitmap cache for layer " + layer.id );
    layerCache.delete( layer.id );
};

export const flushBitmapCache = (): void => {
    //console.info( "flushing bitmap cache" );
    layerCache.clear();
};
