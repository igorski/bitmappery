/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
import Vue from "vue";
import { LAYER_TEXT } from "@/definitions/layer-types";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import { hasFilters, isEqual as isFiltersEqual } from "@/factories/filters-factory";
import { isEqual as isTextEqual } from "@/factories/text-factory";
import { createCanvas, cloneCanvas, matchDimensions } from "@/utils/canvas-util";
import { replaceLayerSource } from "@/utils/layer-util";
import { getLayerCache, setLayerCache } from "@/rendering/cache/bitmap-cache";
import { renderMultiLineText } from "@/rendering/text";
import { loadGoogleFont } from "@/services/font-service";
import FilterWorker from "@/workers/filter.worker.js?worker";
import wasmUrl from "@/wasm/bin/filters.wasm?url";

const jobQueue = [];
let UID = 0;

let useWasm = false;
let wasmWorker;

// expose an Object in which we can keep treck of pending render jobs
export const renderState = Vue.observable({ pending: 0, reset: () => renderState.pending = 0 });

export const setWasmFilters = enabled => {
    useWasm = enabled;
    if ( enabled && !wasmWorker ) {
        wasmWorker = new FilterWorker();
        wasmWorker.onmessage = handleWorkerMessage;
        wasmWorker.postMessage({ cmd: "initWasm", wasmUrl });
    }
};

export const renderEffectsForLayer = async ( layer, useCaching = true ) => {
    const sprite = getSpriteForLayer( layer );

    if ( !sprite || !layer.source ) {
        return;
    }

    ++renderState.pending;

    let { width, height } = layer;
    const { cvs, ctx } = createCanvas( width, height );

    const cached     = useCaching ? getLayerCache( layer ) : null;
    const cacheToSet = {};

    const applyMask     = !!layer.mask;
    const applyFilter   = hasFilters( layer.filters );
    let hasCachedFilter = applyFilter && cached?.filterData && isFiltersEqual( layer.filters, cached.filters );

    // step 1. render layer source contents

    if ( layer.type === LAYER_TEXT && layer.text.value ) {
        let textBitmap;
        if ( cached?.textBitmap && isTextEqual( layer.text, cached.text )) {
            //console.info( "reading rendered text from cache" );
            textBitmap = cached.textBitmap;
        } else {
            textBitmap = await renderText( layer );
            replaceLayerSource( layer, textBitmap );
            //console.info( "writing rendered text to cache" );
            cacheToSet.text = { ...layer.text };
            cacheToSet.textBitmap = textBitmap;
            hasCachedFilter = false; // new contents need to be refiltered
            ({ width, height } = textBitmap );
        }
        matchDimensions( textBitmap, cvs );
        // render text onto destination source
        ctx.drawImage( textBitmap, 0, 0 );
    } else if ( !hasCachedFilter ) {
        //console.info( "draw unfiltered source, will apply filter next: " + applyFilter );
        ctx.drawImage( layer.source, 0, 0 );
    }

    // step 2. apply filters, this step can be cached to avoid unnecessary crunching

    if ( applyFilter ) {
        let imageData;
        if ( hasCachedFilter ) {
            //console.info( "reading filtered content from cache" );
            imageData = cached.filterData;
        } else {
            try {
                imageData = await runFilterJob( cvs, { filters: layer.filters });
                //console.info( "writing filtered content to cache" );
                cacheToSet.filters    = { ...layer.filters };
                cacheToSet.filterData = imageData;
            } catch ( error ) {
                // TODO: communicate error ?
                console.info( `Caught error "${error}" during runFilterJob()` );
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
        //console.info( "apply mask" );
        await renderMask( layer, ctx, applyFilter ? cloneCanvas( cvs ) : layer.source, width, height );
    }

    // step 4. update cache and on-screen canvas contents

    if ( useCaching && Object.keys( cacheToSet ).length ) {
        setLayerCache( layer, cacheToSet );
    }

    renderState.pending = Math.max( 0, renderState.pending - 1 );

    // note that updating the bitmap will also adjust the sprite bounds
    // as appropriate (f.i. if rotation were handled by this service), the
    // Layer model remains unaffected by this
    sprite.setBitmap( cvs, width, height );
    sprite.invalidate();
};

/* internal methods */

/**
 * Run a image processing job in a dedicated Worker.
 *
 * @param {HTMLCanvasElement} source content to process
 * @param {Object} jobSettings job/cmd-specific properties
 * @return {Promise<ImageData>} processed source as ImageData (can be stored in cache)
 */
const runFilterJob = ( source, jobSettings ) => {
    const { width, height } = source;
    const imageData = source.getContext( "2d" ).getImageData( 0, 0, width, height );
    const wasm      = useWasm && wasmWorker;

    return new Promise( async ( resolve, reject ) => {
        const id = ( ++UID );
        let worker, onComplete;
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
        worker.postMessage({ cmd: wasm ? "filterWasm" : "filter", id, imageData, ...jobSettings });
    })
};

function handleWorkerMessage({ data }) {
    const jobQueueObj = getJobFromQueue( data?.id );
    if ( data?.cmd === "complete" ) {
        jobQueueObj?.success( data );
    }
    if ( data?.cmd === "error" ) {
        jobQueueObj?.error( data?.error );
    }
}

/**
 * @param {Object} layer
 * @returns {HTMLCanvasElement}
 */
const renderText = async layer => {
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

const renderMask = async ( layer, ctx, sourceBitmap, width, height ) => {
    if ( !layer.mask ) {
        return;
    }
    ctx.clearRect( 0, 0, width, height );
    ctx.drawImage( sourceBitmap, 0, 0 );

    ctx.save();

    // commenting out the next line allows you to debug by seeing the mask
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage( layer.mask, layer.maskX, layer.maskY );
    ctx.restore();
};

function getJobFromQueue( jobId ) {
    const jobQueueObj = jobQueue.find(({ id }) => id === jobId );
    if ( !jobQueueObj ) {
        return null;
    }
    jobQueue.splice( jobQueue.indexOf( jobQueueObj ), 1 );
    return jobQueueObj;
}
