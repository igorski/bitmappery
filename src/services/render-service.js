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
import { isEqual as isEffectsEqual } from "@/factories/effects-factory";
import { hasFilters, isEqual as isFiltersEqual } from "@/factories/filters-factory";
import { isEqual as isTextEqual } from "@/factories/text-factory";
import { createCanvas, cloneCanvas, matchDimensions } from "@/utils/canvas-util";
import { replaceLayerSource } from "@/utils/layer-util";
import { rotateRectangle, getRotationCenter } from "@/math/rectangle-math";
import { hasLayerCache, getLayerCache, setLayerCache } from "@/rendering/cache/bitmap-cache";
import { renderMultiLineText } from "@/rendering/text";
import { loadGoogleFont } from "@/services/font-service";
import FilterWorker from "@/workers/filter.worker";

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
        wasmWorker.postMessage({ cmd: "initWasm" });
    }
};

export const renderEffectsForLayer = async ( layer, useCaching = true ) => {
    const { effects } = layer;
    const sprite = getSpriteForLayer( layer );

    if ( !sprite || !layer.source ) {
        return;
    }

    ++renderState.pending;

    // if source is rotated, calculate the width and height for the current rotation
    let { width, height } = rotateRectangle( layer, effects.rotation, true );
    const { cvs, ctx } = createCanvas( width, height );

    const cached     = useCaching ? getLayerCache( layer ) : null;
    const cacheToSet = {};

    const applyEffects  = hasEffects( layer );
    const applyFilter   = hasFilters( layer.filters );
    let hasCachedFilter = applyFilter && cached?.filterData && isFiltersEqual( layer.filters, cached.filters );

    // step 1. render layer source contents

    if ( layer.type === LAYER_TEXT && layer.text.value ) {
        let textData;
        if ( cached?.textData && isTextEqual( layer.text, cached.text )) {
            //console.info( "reading rendered text from cache" );
            textData = cached.textData;
        } else {
            textData = await renderText( layer );
            replaceLayerSource( layer, textData );
            //console.info( "writing rendered text to cache" );
            cacheToSet.text     = { ...layer.text };
            cacheToSet.textData = textData;
            hasCachedFilter = false; // new contents need to be refiltered
        }
        // update dimensions as text shrinks/expands to fit
        ({ width, height } = rotateRectangle( textData, effects.rotation, true ));
        matchDimensions({ width, height }, cvs );
        // render text onto destination source
        ctx.drawImage( textData, 0, 0 );
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

    // step 3. apply effects
    // TODO: hook these into cache as well ? then again this is the last action in an otherwise cached queue...

    if ( applyEffects ) {
        //console.info( "apply effects", JSON.stringify( layer.effects ));
        await renderTransformedSource( layer, ctx, applyFilter ? cloneCanvas( cvs ) : layer.source, width, height, effects );
    }

    // step 4. update cache and on-screen canvas contents

    if ( useCaching && Object.keys( cacheToSet ).length ) {
        setLayerCache( layer, cacheToSet );
    }

    renderState.pending = Math.max( 0, renderState.pending - 1 );

    // note that updating the bitmap will also adjust the sprite bounds
    // as appropriate (e.g. on rotation), the Layer model remains unaffected by this
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
};

const hasEffects = layer => {
    if ( !!layer.mask ) {
        return true;
    }
    const { effects } = layer;
    return effects.rotation !== 0 || effects.mirrorX || effects.mirrorY;
};

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

const renderTransformedSource = async ( layer, ctx, sourceBitmap, width, height, { mirrorX, mirrorY, rotation }) => {
    const rotate = ( rotation % 360 ) !== 0;
    let targetX = mirrorX ? -width  : 0;
    let targetY = mirrorY ? -height : 0;

    const xScale = mirrorX ? -1 : 1;
    const yScale = mirrorY ? -1 : 1;

    ctx.clearRect( 0, 0, width, height );
    ctx.save();
    ctx.scale( xScale, yScale );

    if ( rotate ) {
        const { x, y } = getRotationCenter({
            left   : 0,
            top    : 0,
            width  : mirrorX ? -width : width,
            height : mirrorY ? -height : height
        }, true );
        ctx.translate( x, y );
        ctx.rotate( rotation );
        ctx.translate( -x, -y );
        targetX = x - layer.width  * .5;
        targetY = y - layer.height * .5;
    }
    ctx.drawImage( sourceBitmap, targetX, targetY );
    await renderMask( layer, ctx, targetX, targetY );

    ctx.restore();
};

const renderMask = async( layer, ctx, tX = 0, tY = 0 ) => {
    if ( !layer.mask ) {
        return;
    }
    ctx.save();
    ctx.translate( tX, tY );
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
