/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
import { type Filters } from "@/definitions/document";
import FiltersFactory from "@/factories/filters-factory";
import { imageDataAsFloat } from "@/utils/wasm-util";
import type { WasmFilterInstance } from "@/utils/wasm-util";
import { applyAdjustments } from "@/rendering/filters/adjustments";
import { applyDuotone } from "@/rendering/filters/duotone";
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

    applyAdjustments( pixels, filters );

    if ( filters.duotone.enabled ) {
        applyDuotone( pixels, filters.duotone.color1, filters.duotone.color2 );
    }
    return pixels;
}

/* internal methods */

function renderFiltersWasm( imageData: ImageData, filters: any ): Uint8ClampedArray {
    const brightness     = ( filters.brightness * 2 );//( filters.brightness * 2 ) - 1; // -1 to 1 range
    const contrast       = Math.pow((( filters.contrast * 100 ) + 100 ) / 100, 2 ); // -100 to 100 range
    const gamma          = ( filters.gamma * 2 ); // 0 to 2 range
    const vibrance       = -(( filters.vibrance * 200 ) - 100 ); // -100 to 100 range
    const { desaturate, invert, threshold } = filters;

    const doBrightness = filters.brightness !== defaultFilters.brightness;
    const doContrast   = filters.contrast   !== defaultFilters.contrast;
    const doGamma      = filters.gamma      !== defaultFilters.gamma;
    const doVibrance   = filters.vibrance   !== defaultFilters.vibrance;

    // @todo these are not supported by the WASM variant yet

    const doInvert     = invert    !== defaultFilters.invert;
    const doThreshold  = threshold !== defaultFilters.threshold;
    const doDuotone    = filters.duotone.enabled !== defaultFilters.duotone.enabled;

    // run WASM operations

    return imageDataAsFloat( imageData, wasmInstance, ( memory, length ) => {
        wasmInstance._filter(
            memory, length,
            gamma, brightness, contrast, vibrance,/* threshold, duotone.color1, duotone.color2 */
            doGamma, desaturate, doBrightness, doContrast, doVibrance/*, doThreshold, doDuotone*/
        );
    });
}
