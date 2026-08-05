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
import { getValue } from "@/definitions/filter-ranges";
import { type Filters } from "@/model/types/filters";
import FiltersFactory from "@/model/factories/filters-factory";
import { imageDataAsFloat } from "@/utils/wasm-util";
import type { WasmFilterInstance } from "@/utils/wasm-util";
import { applyAdjustments } from "@/rendering/filters/adjustments";
import { applyBlur } from "@/rendering/filters/blur";
import { applyDuotone } from "@/rendering/filters/duotone";
import { applyWhiteBalance } from "@/rendering/filters/white-balance";
import { applyHSL } from "@/rendering/filters/hsl";
import wasmJs from "@/wasm/bin/filters.js";

const defaultFilters = FiltersFactory.create();
let wasmInstance: WasmFilterInstance;

self.addEventListener( "message", async ({ data }: MessageEvent ): Promise<void> => {
    const { id, cmd }: { id: string, cmd: string } = data;
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
                pixelData = renderFilters( data.imageData, data.filters );
                self.postMessage({ cmd: "complete", id, pixelData });
            } catch ( error ) {
                self.postMessage({ cmd: "error", id, error });
            }
            break;
    }
}, false );

/* internal methods */

function renderFilters( imageData: ImageData, filters: Filters ): Uint8ClampedArray {
    const pixels = imageData.data;

    if ( filters.blur > 0 ) {
        applyBlur( pixels, imageData.width, imageData.height, filters.blur );
    }

    if ( filters.quick.whiteBalance ) {
        applyWhiteBalance( pixels );
    }
    applyAdjustments( pixels, filters );

    if ( filters.duotone.enabled ) {
        applyDuotone( pixels, filters.duotone.color1, filters.duotone.color2 );
    }

    if ( filters.hsl.hue !== 0 || filters.hsl.sat !== 0 || filters.hsl.lightness !== 0 ) {
        applyHSL( pixels, filters.hsl.hue, filters.hsl.sat, filters.hsl.lightness );
    }
    return pixels;
}

/* internal methods */

function renderFiltersWasm( imageData: ImageData, filters: Filters ): Uint8ClampedArray {
    const doBrightness = filters.brightness !== defaultFilters.brightness;
    const doContrast   = filters.contrast   !== defaultFilters.contrast;
    const doGamma      = filters.gamma      !== defaultFilters.gamma;
    const doVibrance   = filters.vibrance   !== defaultFilters.vibrance;
    const doDesaturate = filters.quick.desaturate;

    const brightness     = getValue( filters, "brightness" );
    const contrast       = getValue( filters, "contrast" );
    const gamma          = getValue( filters, "gamma" );
    const vibrance       = getValue( filters, "vibrance" );
    const { threshold }  = filters;
    
    // @todo these are not supported by the WASM variant yet

    const doExposure   = filters.exposure !== defaultFilters.exposure;
    const doInvert     = filters.quick.invert;
    const doThreshold  = threshold !== defaultFilters.threshold;
    const doWhiteBalance = filters.quick.whiteBalance;
    const doDuotone    = filters.duotone.enabled !== defaultFilters.duotone.enabled;
    const doHSL        = filters.hsl.hue !== 0 || filters.hsl.sat !== 0 || filters.hsl.lightness !== 0;
    const doBlur       = filters.blur > 0;
    
    const exposure = getValue( filters, "exposure" );

    // run WASM operations

    return imageDataAsFloat( imageData, wasmInstance, ( memory: number, length: number ): void => {
        wasmInstance._filter(
            memory, length,
            gamma, brightness, contrast, vibrance,/* threshold, exposure, duotone.color1, duotone.color2 */
            doGamma, doDesaturate, doBrightness, doContrast, doVibrance/*, doExposure, doWhiteBalance, doThreshold, doDuotone, doHSL, doBlur*/
        );
    });
}
