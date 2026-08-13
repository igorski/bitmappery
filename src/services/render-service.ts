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
import { type CanvasDrawable } from "@/definitions/editor";
import { LayerTypes } from "@/definitions/layer-types";
import { getRendererForLayer } from "@/model/factories/renderer-factory";
import { hasFilters, isEqual as isFiltersEqual } from "@/model/factories/filters-factory";
import { isEqual as isTextEqual } from "@/model/factories/text-factory";
import { type Layer } from "@/model/types/layer";
import { createCanvas, cloneCanvas, cloneImageData, matchDimensions } from "@/utils/canvas-util";
import { replaceLayerSource } from "@/utils/layer-util";
import { clone } from "@/utils/object-util";
import { getLayerCache, setLayerCache } from "@/rendering/cache/bitmap-cache";
import { type RenderCache } from "@/rendering/cache/bitmap-cache";
import { maskImage } from "@/rendering/operations/masking";
import { renderMultiLineText } from "@/rendering/operations/text";
import {
    type FilterWorkerMessageResult,
    type IFilterWorker,
    type RenderResult,
    type RenderStatus,
    type RenderJob,
    RenderCancelError
} from "@/rendering/types";
import { loadGoogleFont } from "@/services/font-service";
import FilterWorker from "@/workers/filter.worker?worker";
import wasmUrl from "@/wasm/bin/filters.wasm?url";

const jobQueue: RenderJob[] = [];
let UID = 0;

// Workers are spawned and terminated per job, but can be persisted
// in case of frequently repeating actions on the same sources
type PersistedWorker = {
    worker: IFilterWorker;
    output?: ImageData; // pooled buffer to render filtered output on
    busy?: boolean; // whether Worker is currently processing
    dispose?: boolean; // whether to dispose Worker when done (e.g. freeWorker() requested while busy)
};
const persistedWorkers: Map<string, PersistedWorker> = new Map();
let useWasm = false;

// expose an Object in which we can keep track of pending render jobs
export const renderState = reactive({ pending: 0, reset: () => renderState.pending = 0 });

export const setWasmFilters = ( enabled: boolean ): void => {
    useWasm = enabled;
    if ( enabled && !persistedWorkers.has( "wasm" ) ) {
        const worker = new FilterWorker();
        worker.onmessage = handleWorkerMessage;
        worker.postMessage({ cmd: "initWasm", wasmUrl });
        persistedWorkers.set( "wasm", { worker });
    }
};

export const renderEffectsForLayer = async ( layer: Layer, useCaching = true ): Promise<RenderResult> => {
    ++renderState.pending;
    
    const result: RenderResult = { status: "init", start: window.performance.now(), end: 0, duration: 0 };
    const renderer = getRendererForLayer( layer );

    if ( !renderer || !layer.source ) {
        return completeTask( result, "cancelled" );
    }
    // const DEBUG_PREFIX = `EFFECTS_RENDER for ${layer.id}, at:${result.start.toFixed( 2 )}`;

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
                imageData = await runFilterJob( result, cvs, layer );
                // console.info( `${DEBUG_PREFIX}: completed runFilterJob(), writing filtered content to cache.` );

                cacheToSet.filters = clone( layer.filters );
                cacheToSet.filterData = imageData;
            } catch ( error: any ) {
                // TODO: communicate error to user?
                // console.error( `${DEBUG_PREFIX}: Caught error "${error}" during runFilterJob(), filter job id: ${result.jobId}.` );

                return completeTask( result, error instanceof RenderCancelError ? "cancelled" : "errored", error );
            }
        }

        try {
            ctx.putImageData( imageData, 0, 0 );
        } catch ( error: any ) {
            return completeTask( result, "errored", error ); // likely InvalidStateError
        }
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

    const completedTask = completeTask( result, "completed" );

    // note that updating the bitmap will also adjust the renderer bounds
    // as appropriate (f.i. if rotation were handled by this service), the
    // Layer model remains unaffected by this
    renderer.setBitmap( cvs, width, height );
    renderer.invalidate();
    
    return completedTask;
};

export const reserveWorker = ( layer: Layer ): string => {
    if ( persistedWorkers.has( layer.id )) {
        return layer.id;
    }
    const worker = new FilterWorker();
    worker.onmessage = handleWorkerMessage;

    persistedWorkers.set( layer.id, { worker });
    updateWorker( layer );

    return layer.id;
};

export const updateWorker = ( layer: Layer ): void => {
    const persistedWorker = persistedWorkers.get( layer.id );
    if ( !persistedWorker ) {
        return;
    }
    const imageData = getDataSource( layer.source );

    persistedWorker.output = cloneImageData( imageData );
    persistedWorker.worker.postMessage({ cmd: "reserve", sourceId: layer.id, imageData }, [ imageData.data.buffer ]);
};

export const freeWorker = ( id: string ): boolean => {
    if ( !persistedWorkers.has( id )) {
        return true;
    }
    const persisted = persistedWorkers.get( id );
    if ( persisted.busy === true ) {
        persisted.dispose = true;
        return false;
    }
    persisted!.worker.terminate();
    persistedWorkers.delete( id );

    return true;
};

/* internal methods */

/**
 * Run a image processing job in a dedicated Worker.
 *
 * @param {RenderResult} result object of the request method
 * @param {HTMLCanvasElement} source content to process
 * @param {Layer} layer owning the source content
 * @return {Promise<ImageData>} processed source as ImageData (can be stored in cache)
 */
function runFilterJob( result: RenderResult, source: HTMLCanvasElement, layer: Layer ): Promise<ImageData> {
    const id = ( ++UID );
    result.jobId = id;

    return new Promise( async ( resolve, reject ) => {
        let persisted: PersistedWorker;
        let worker: IFilterWorker;
        let onComplete: () => void;
        let workerId = layer.id;

        if ( useWasm ) {
            workerId = "wasm"; // single Worker for WASM filter job
        }

        if ( persistedWorkers.has( workerId )) {
            persisted = persistedWorkers.get( workerId )!;
            worker = persisted.worker;
            onComplete = () => {
                persisted.busy = false;
                if ( persisted.dispose ) {
                    freeWorker( workerId ); // disposal requested during render, free now
                }
            };
        } else {
            // when not using as persisted Worker, the Workers are lazily created per job so we can parallelize
            worker = new FilterWorker();
            worker.onmessage = handleWorkerMessage;
            onComplete = () => worker.terminate();
        }
        
        const filters = clone( layer.filters );
        const job: RenderJob = {
            id,
            layerId: layer.id,
            success: data => {
                const output = new ImageData( data.pixelData, source.width, source.height );
                if ( persisted ) {
                    persisted.output = output; // use as output canvas on next run
                }
                resolve( output );
                onComplete?.();
            },
            error: optError => {
                onComplete?.();
                reject( optError );
            }
        };

        const executeJob = (): void => {
            let imageData: ImageData;
            let sourceId: string | undefined;
            
            if ( persisted?.output ) {
                imageData = persisted.output;
                sourceId = workerId;
            } else {
                imageData = getDataSource( source );
            }

            if ( persisted ) {
                persisted.busy = true;
            }

            worker.postMessage({
                cmd: useWasm ? "filterWasm" : "filter",
                id,
                sourceId,
                imageData,
                filters,
            }, [ imageData.data.buffer ] );
        };

        const existingJobsForLayer = jobQueue.filter(({ layerId }) => layerId === layer.id );
        jobQueue.push( job );

        if ( existingJobsForLayer.length > 0 ) {
            existingJobsForLayer.forEach(( existingJob, index ) => {
                if ( index === 0 ) {
                    // after completion of first job (is currently executing one), start execution of this one
                    existingJob.after = () => window.requestAnimationFrame( executeJob );
                } else {
                    // any other job still pending after the first one can be removed and cancelled in favour of this one
                    getJobFromQueue( existingJob.id )?.error(
                        new RenderCancelError( `Newer job ${id} enqueued, cancelling this one.` )
                    );
                }
            });
        } else {
            executeJob();
        }
    });
}

function handleWorkerMessage({ data }: MessageEvent<FilterWorkerMessageResult> ): void {
    const jobQueueObj = getJobFromQueue( data?.id );
    if ( data?.cmd === "complete" ) {
        jobQueueObj?.success( data );
    }
    if ( data?.cmd === "error" ) {
        jobQueueObj?.error( data?.error );
    }
    jobQueueObj?.after?.();
}

async function renderText( layer: Layer ): Promise<HTMLCanvasElement> {
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
}

function renderMask( layer: Layer, ctx: CanvasRenderingContext2D, sourceBitmap: HTMLCanvasElement, width: number, height: number ): void {
    if ( !layer.mask ) {
        return;
    }
    maskImage( ctx, sourceBitmap, layer.mask, width, height, layer.maskX, layer.maskY );
}

function completeTask( result: RenderResult, newStatus?: RenderStatus, error?: string ): RenderResult {
    result.end = window.performance.now();
    result.duration = result.end - result.start;

    renderState.pending = Math.max( 0, renderState.pending - 1 );

    let logSuffix = result.jobId ? `, filter job id: ${result.jobId}` : "";

    if ( newStatus ) {
        result.status = newStatus;
    }
    if ( error ) {
        result.error = error;
        logSuffix += `, error: ${error}`;
    }
    // console.info( `Render job completed with status "${result.status}", duration: ${result.duration.toFixed(2)}ms${logSuffix}` );

    return result;
}

function getJobFromQueue( jobId: number ): RenderJob | undefined {
    const jobQueueObj = jobQueue.find(({ id }) => id === jobId );
    if ( !jobQueueObj ) {
        return;
    }
    jobQueue.splice( jobQueue.indexOf( jobQueueObj ), 1 );
    return jobQueueObj;
}

function getDataSource( source: CanvasDrawable ): ImageData {
    if ( !( source instanceof HTMLCanvasElement )) {
        const { cvs, ctx } = createCanvas( source.width, source.height );
        ctx.drawImage( source, 0, 0 );
        source = cvs;
    }
    return source.getContext( "2d" )!.getImageData( 0, 0, source.width, source.height );
}
