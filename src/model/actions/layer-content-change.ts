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
import { type Layer } from "@/model/types/layer";
import { getRendererForLayer } from "@/model/factories/renderer-factory";
import { affectsBlendCache, flushBlendedLayerCache } from "@/rendering/cache/blended-layer-cache";
import { updateWorker } from "@/services/render-service";

export type IChangeSource = keyof Layer;
type IContentChangeOpts = {
    sources: IChangeSource[]; // which Layer properties have changed
    index?: number; // index of the Layer inside its Document
};

const FLUSH_BLEND_CACHE_TRIGGERS: IChangeSource[] = [ "filters", "visible" ];
const FILTER_RESET_AND_RECACHE_TRIGGERS: IChangeSource[] = [ "source", "mask", "maskX", "maskY" ];

/**
 * This action doesn't trigger a state change in the model but should be called
 * as the reaction to such a change if it affects the Layers state to the extent
 * that the caches of the renderer need to be flushed and rebuilt.
 */
export const layerContentChange = ( layer: Layer, opts: IContentChangeOpts = { sources: [] }): void => {
    const { sources } = opts;

    const renderer = getRendererForLayer( layer );
    if ( !renderer ) {
        return;
    }
    renderer.layer = layer; // update layer ref
    
    const hasBlendCacheTrigger = sources.some( source => FLUSH_BLEND_CACHE_TRIGGERS.includes( source ));
    if ( hasBlendCacheTrigger ) {
        if ( typeof opts.index !== "number" ) {
            // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
            if ( import.meta.env.MODE !== "production" ) {
                throw new Error( `onLayerContentChange has blend cache invalidation without index` );
            }
            console.error( `onLayerContentChange has blend cache invalidation without index` );
        } else if ( affectsBlendCache( opts.index )) {
            flushBlendedLayerCache( true ); // direct to prevent rendering errors on undo
        }
    }

    if ( sources.some( source => FILTER_RESET_AND_RECACHE_TRIGGERS.includes( source ))) {
        updateWorker( layer ); // @todo better guard?
        renderer.resetFilterAndRecache();
    } else if ( sources.includes( "filters" )) {
        renderer.cacheEffects();
    }
};