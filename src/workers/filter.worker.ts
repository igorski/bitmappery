/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2026 - https://www.igorski.nl
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
import { denormalise } from "@/definitions/filter-ranges";
import { type Filters } from "@/model/types/filters";
import FiltersFactory from "@/model/factories/filters-factory";
import { type WasmFilterInstance } from "@/utils/wasm-util";
import { applyAdjustments } from "@/rendering/filters/adjustments";
import { applyBlur } from "@/rendering/filters/blur";
import { applyDuotone } from "@/rendering/filters/duotone";
import { applyWhiteBalance } from "@/rendering/filters/white-balance";
import { applyHSL } from "@/rendering/filters/hsl";
import { type FilterWorkerMessageData, type FilterWorkerMessageResult } from "@/rendering/types";
import { imageDataAsFloat } from "@/utils/wasm-util";
import wasmJs from "@/wasm/bin/filters.js";

// @todo: should be WorkerGlobalScope
declare const self: WindowOrWorkerGlobalScope & {
    postMessage( message: FilterWorkerMessageResult, options?: StructuredSerializeOptions ): void;
    addEventListener( type: "message", listener: ( event: MessageEvent<FilterWorkerMessageData> ) => void, options?: boolean | AddEventListenerOptions ): void;
};

const defaultFilters = FiltersFactory.create();
let wasmInstance: WasmFilterInstance;

const persistedSources: Map<string, ImageData> = new Map(); // mapped by source (Layer) id

self.addEventListener( "message", async ({ data }: MessageEvent<FilterWorkerMessageData> ): Promise<void> => {
    const { id, cmd } = data;
    let pixelData: Uint8ClampedArray;

    switch ( cmd ) {

        // when using WebAssembly this method needs to be invoked first
        // as it will load the WASM binary

        case "initWasm":
            const wasm   = await fetch( data.wasmUrl );
            const bytes  = await wasm.arrayBuffer();
            wasmInstance = await wasmJs({
                wasmBinary: bytes
            });
            self.postMessage({ cmd: "ready" });
            break;

        // persist an ImageData Object (saves transport overhead on repeated calls)

        case "reserve":
            persistedSources.set( data.sourceId, data.imageData );
            break;

        // run the filter operation on a {ImageData} object
        // filterWasm to run the filters using WebAssembly, filter to run
        // it as JavaScript. Both instances return a filtered {Uint8ClampedArray}
        // which can be set as onto an ImageData in the main application

        case "filterWasm":
            try {
                pixelData = renderFiltersWasm( data.imageData, data.filters );
                // @ts-expect-error no overload matches this call (on Transferable)
                self.postMessage({ cmd: "complete", id, pixelData }, [ pixelData.buffer ]);
            } catch ( error ) {
                self.postMessage({ cmd: "error", id, error });
            }
            break;

        case "filter":
            try {
                const source = data.sourceId ? persistedSources.get( data.sourceId ) : data.imageData;
                pixelData = renderFilters( source, data.imageData, data.filters );
                self.postMessage({ cmd: "complete", id, pixelData }, { transfer: [ pixelData.buffer ] });
            } catch ( error ) {
                self.postMessage({ cmd: "error", id, error });
            }
            break;
    }
}, false );

/* internal methods */

function renderFilters( inputData: ImageData, outputData: ImageData, filters: Filters ): Uint8ClampedArray {
    if ( inputData.width !== outputData.width || inputData.height !== outputData.height ) {
        throw new Error( "Incompatible input and output buffer sizes" );
    }
    let input = inputData.data;
    const output = outputData.data;

    // white balance comes first

    if ( filters.quick.whiteBalance ) {
        applyWhiteBalance( input, output );
        input = output; // as a filter has been applied, subsequent filters will use the filtered output as input
    }
    // adjustments are always executed, even when the filter configurations makes
    // the effect application a no-op, it will sync the input and output buffers cheaply
    // without needing a clone operation on filtering start (necessary in case alpha values were adjusted
    // in a previous run, for instance by the more extreme blur settings)

    applyAdjustments( input, output, filters );
    input = output; // from this point on, all filters will take affected output as input

    if ( filters.hsl.hue !== 0 || filters.hsl.sat !== 0 || filters.hsl.lightness !== 0 ) {
        applyHSL( input, output, filters.hsl.hue, filters.hsl.sat, filters.hsl.lightness );
    }

    if ( filters.duotone.enabled ) {
        applyDuotone( input, output, filters.duotone.color1, filters.duotone.color2 );
    }
    
    if ( filters.blur > 0 ) {
        applyBlur( input, output, outputData.width, outputData.height, filters.blur );
    }
    return output;
}

/* internal methods */

function renderFiltersWasm( imageData: ImageData, filters: Filters ): Uint8ClampedArray {
    const doBrightness = filters.brightness !== defaultFilters.brightness;
    const doContrast   = filters.contrast   !== defaultFilters.contrast;
    const doGamma      = filters.gamma      !== defaultFilters.gamma;
    const doVibrance   = filters.vibrance   !== defaultFilters.vibrance;
    const doDesaturate = filters.quick.desaturate;

    const brightness     = denormalise( filters, "brightness" );
    const contrast       = denormalise( filters, "contrast" );
    const gamma          = denormalise( filters, "gamma" );
    const vibrance       = denormalise( filters, "vibrance" );
    const { threshold }  = filters;
    
    // @todo these are not supported by the WASM variant yet

    const doExposure   = filters.exposure !== defaultFilters.exposure;
    const doInvert     = filters.quick.invert;
    const doThreshold  = threshold !== defaultFilters.threshold;
    const doWhiteBalance = filters.quick.whiteBalance;
    const doDuotone    = filters.duotone.enabled !== defaultFilters.duotone.enabled;
    const doHSL        = filters.hsl.hue !== 0 || filters.hsl.sat !== 0 || filters.hsl.lightness !== 0;
    const doBlur       = filters.blur > 0;
    
    const exposure = denormalise( filters, "exposure" );

    // run WASM operations

    return imageDataAsFloat( imageData, wasmInstance, ( memory: number, length: number ): void => {
        wasmInstance._filter(
            memory, length,
            gamma, brightness, contrast, vibrance,/* threshold, exposure, duotone.color1, duotone.color2 */
            doGamma, doDesaturate, doBrightness, doContrast, doVibrance/*, doExposure, doWhiteBalance, doThreshold, doDuotone, doHSL, doBlur*/
        );
    });
}
