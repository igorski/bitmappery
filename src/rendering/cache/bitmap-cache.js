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
const layerCache = new Map();

export const getLayerCache = ({ id }) => layerCache.get( id );

export const setLayerCache = ( layer, props ) => {
    const cache = getLayerCache( layer ) ?? {};
    layerCache.set( layer.id, { ...cache, ...props });
};

export const hasLayerCache = ({ id }) => layerCache.has( id );

export const clearCacheProperty = ( layer, propertyName ) => {
    const cache = getLayerCache( layer );
    if ( cache?.[ propertyName ] ) {
        delete cache[ propertyName ];
    }
};

export const flushLayerCache = layer => {
    //console.info( "flushing bitmap cache for layer " + layer.id );
    layerCache.delete( layer.id );
};

export const flushCache = () => {
    //console.info( "flushing bitmap cache" );
    layerCache.clear();
};
