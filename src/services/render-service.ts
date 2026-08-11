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
import { reactive } from "vue";
import { LayerTypes } from "@/definitions/layer-types";
import { getRendererForLayer } from "@/model/factories/renderer-factory";
import { hasFilters, isEqual as isFiltersEqual } from "@/model/factories/filters-factory";
import { isEqual as isTextEqual } from "@/model/factories/text-factory";
import { type Filters } from "@/model/types/filters";
import { type Layer } from "@/model/types/layer";
import { createCanvas, cloneCanvas, matchDimensions } from "@/utils/canvas-util";
import { replaceLayerSource } from "@/utils/layer-util";
import { clone } from "@/utils/object-util";
import { getLayerCache, setLayerCache } from "@/rendering/cache/bitmap-cache";
import type { RenderCache } from "@/rendering/cache/bitmap-cache";
import { maskImage } from "@/rendering/operations/masking";
import { renderMultiLineText } from "@/rendering/operations/text";
import { loadGoogleFont } from "@/services/font-service";
import FilterWorker from "@/workers/filter.worker?worker";
import wasmUrl from "@/wasm/bin/filters.wasm?url";

type RenderJob = {
    id: number;
    success: ( data: { pixelData: ArrayLike<number> } ) => void;
    error: ( error?: any ) => void;
};

const jobQueue: RenderJob[] = [];
let UID = 0;

let useWasm = false;
let wasmWorker: Worker;

// expose an Object in which we can keep track of pending render jobs
export const renderState = reactive({ pending: 0, reset: () => renderState.pending = 0 });

export const setWasmFilters = ( enabled: boolean ): void => {
    useWasm = enabled;
    if ( enabled && !wasmWorker ) {
        wasmWorker = new FilterWorker();
        wasmWorker.onmessage = handleWorkerMessage;
        wasmWorker.postMessage({ cmd: "initWasm", wasmUrl });
    }
};

export const renderEffectsForLayer = async ( layer: Layer, useCaching = true ): Promise<void> => {
    const renderer = getRendererForLayer( layer );

    if ( !renderer || !layer.source ) {
        return;
    }

    ++renderState.pending;
    const DEBUG_PREFIX = `EFFECTS_RENDER for ${layer.id}, at:${window.performance.now().toFixed( 2 )}`;

    let { width, height } = layer;
    const { cvs, ctx } = createCanvas( width, height );

    const cached = useCaching ? getLayerCache( layer ) : null;
    const cacheToSet: RenderCache = {};

    const applyMask     = !!layer.mask;
    const applyFilter   = hasFilters( layer.filters );
    let hasCachedFilter = applyFilter && cached?.filterData && isFiltersEqual( layer.filters, cached.filters );

    // step 1. render layer source contents

    if ( layer.type === LayerTypes.LAYER_TEXT && layer.text.value ) {
        let textBitmap;
        if ( cached?.textBitmap && isTextEqual( layer.text, cached.text )) {
            // console.info( `${DEBUG_PREFIX}: reading rendered text from cache.` );
            textBitmap = cached.textBitmap;
        } else {
            textBitmap = await renderText( layer );
            replaceLayerSource( layer, textBitmap );
            // console.info( `${DEBUG_PREFIX}: writing rendered text to cache.` );
            cacheToSet.text = { ...layer.text };
            cacheToSet.textBitmap = textBitmap;
            hasCachedFilter = false; // new contents need to be refiltered
            ({ width, height } = textBitmap );
        }
        matchDimensions( textBitmap, cvs );
        // render text onto destination source
        ctx.drawImage( textBitmap, 0, 0 );
    } else if ( !hasCachedFilter ) {
        // console.info( `${DEBUG_PREFIX}: draw unfiltered source, will apply filter next: ${applyFilter.toString()}.` );
        ctx.drawImage( layer.source, 0, 0 );
    }

    // step 2. apply filters, this step can be cached to avoid unnecessary crunching

    if ( applyFilter ) {
        let imageData;
        if ( hasCachedFilter ) {
            // console.info( `${DEBUG_PREFIX}: reading filtered content from cache.` );
            imageData = cached.filterData;
        } else {
            try {
                // console.info( `${DEBUG_PREFIX}: start runFilterJob().` );
                imageData = await runFilterJob( cvs, layer.filters );
                // console.info( `${DEBUG_PREFIX}: completed runFilterJob(), writing filtered content to cache.` );
                cacheToSet.filters    = { ...layer.filters };
                cacheToSet.filterData = imageData;
            } catch ( error ) {
                // TODO: communicate error to user?
                console.error( `${DEBUG_PREFIX}: Caught error "${error}" during runFilterJob().` );
                renderState.pending = Math.max( 0, renderState.pending - 1 );
                return;
            }
        }
        ctx.clearRect( 0, 0, width, height );
        ctx.putImageData( imageData, 0, 0 );
    }

    // step 3. apply mask
    // TODO: hook this into cache as well ? then again this is the last action in an otherwise cached queue...

    if ( applyMask ) {
        // console.info( `${DEBUG_PREFIX}: applying mask.` );
        const unmaskedBitmap = cloneCanvas( cvs );
        renderer.setUnmaskedBitmap( unmaskedBitmap );
        renderMask( layer, ctx, applyFilter ? unmaskedBitmap : layer.source, width, height );
    } else {
        renderer.setUnmaskedBitmap( undefined );
    }

    // step 4. update cache and on-screen canvas contents

    if ( useCaching && Object.keys( cacheToSet ).length ) {
        setLayerCache( layer, cacheToSet );
    }

    renderState.pending = Math.max( 0, renderState.pending - 1 );

    // note that updating the bitmap will also adjust the renderer bounds
    // as appropriate (f.i. if rotation were handled by this service), the
    // Layer model remains unaffected by this
    renderer.setBitmap( cvs, width, height );
    renderer.invalidate();
};

/* internal methods */

/**
 * Run a image processing job in a dedicated Worker.
 *
 * @param {HTMLCanvasElement} source content to process
 * @param {Filters} filters to apply
 * @return {Promise<ImageData>} processed source as ImageData (can be stored in cache)
 */
const runFilterJob = ( source: HTMLCanvasElement, filters: Filters ): Promise<ImageData> => {
    const imageData = source.getContext( "2d" )!.getImageData( 0, 0, source.width, source.height );
    const wasm      = useWasm && wasmWorker;

    return new Promise( async ( resolve, reject ) => {
        const id = ( ++UID );
        let worker: Worker;
        let onComplete: () => void;

        if ( wasm ) {
            worker = wasmWorker;
        } else {
            // when not in WASM mode, Worker is lazily created per process so we can parallelize
            worker = new FilterWorker();
            worker.onmessage = handleWorkerMessage;
            onComplete = () => worker.terminate();
        }
        jobQueue.push({
            id,
            success: async data => {
                imageData.data.set( data.pixelData );
                onComplete?.();
                resolve( imageData );
            },
            error: optError => {
                // TODO: when wasm, disable wasm mode and return to JS worker ?
                onComplete?.();
                reject( optError );
            }
        });
        worker.postMessage({
            cmd: wasm ? "filterWasm" : "filter",
            id,
            imageData,
            filters: clone( filters ),
        });
    })
};

function handleWorkerMessage({ data }: MessageEvent ): void {
    const jobQueueObj = getJobFromQueue( data?.id );
    if ( data?.cmd === "complete" ) {
        jobQueueObj?.success( data );
    }
    if ( data?.cmd === "error" ) {
        jobQueueObj?.error( data?.error );
    }
}

const renderText = async ( layer: Layer ): Promise<HTMLCanvasElement> => {
    const { text } = layer;
    let font = text.font;
    try {
        await loadGoogleFont( font ); // lazily loads font file upon first request
    } catch {
        font = "Arial"; // fall back to universally available Arial
    }
    const { cvs, ctx } = createCanvas();
    renderMultiLineText( ctx, text );

    // render outlines to debug cropped bounding box
    //ctx.fillStyle = "rgba(255,0,0,.5)";
    //ctx.fillRect( 0, 0, cvs.width, cvs.height );

    return cvs;
};

const renderMask = ( layer: Layer, ctx: CanvasRenderingContext2D, sourceBitmap: HTMLCanvasElement, width: number, height: number ): void => {
    if ( !layer.mask ) {
        return;
    }
    maskImage( ctx, sourceBitmap, layer.mask, width, height, layer.maskX, layer.maskY );
};

function getJobFromQueue( jobId: number ): RenderJob | undefined {
    const jobQueueObj = jobQueue.find(({ id }) => id === jobId );
    if ( !jobQueueObj ) {
        return undefined;
    }
    jobQueue.splice( jobQueue.indexOf( jobQueueObj ), 1 );
    return jobQueueObj;
}
