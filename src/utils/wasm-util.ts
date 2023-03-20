/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
export interface WasmFilterInstance {
    HEAP8: Int8Array;
    HEAP16: Int16Array;
    HEAP32: Int32Array;
    HEAPF32: Float32Array;
    HEAPF64: Float64Array;
    HEAPU8: Uint8Array;
    HEAPU16: Uint16Array;
    HEAPU32: Uint32Array;
    wasmBinary: ArrayBuffer;
    _filter: ( ...args: any ) => void;
    _malloc: ( size: number ) => number;
    _free: ( memory: number ) => void;
};

type ProcessFn = ( memory: number, length: number ) => void;

/**
 * Runs given fn (WASM function pointer) on given imageData
 * where the data is treated as float32 inside WASM.
 * Memory is allocated and freed accordingly.
 *
 * @param {ImageData} imageData
 * @param {WasmFilterInstance} wasmInstance
 * @param {ProcessFn} fn function to execute with created WASM memory
 * @return {Uint8ClampedArray} processed imageData.data
 */
export const imageDataAsFloat = ( imageData: ImageData, wasmInstance: WasmFilterInstance,
    fn: ProcessFn ): Uint8ClampedArray => {

    const { length } = imageData.data;
    const sizeofFloat = Float32Array.BYTES_PER_ELEMENT;
    const memorySize  = length * sizeofFloat;

    // allocate and set ImageData into WASM memory
    const memory = wasmInstance._malloc( memorySize );
    wasmInstance.HEAPF32.set( imageData.data, memory / sizeofFloat );

    // run WASM operations on float32 data
    fn( memory, length );

    // retrieve operation result to be returned to JS
    const processedImageData = new Uint8ClampedArray( wasmInstance.HEAPF32.subarray(
        memory / sizeofFloat,
        memory / sizeofFloat + length
    ));
    wasmInstance._free( memory ); // ...and free WASM memory

    return processedImageData;
};

/**
 * Runs given fn (WASM function pointer) on given imageData
 * where the data is treated as unsigned char (8-bit) inside WASM.
 * Memory is allocated and freed accordingly.
 *
 * @param {ImageData} imageData
 * @param {WasmFilterInstance} wasmInstance
 * @param {ProcessFn} fn function to execute with created WASM memory
 * @return {Uint8ClampedArray} processed imageData.data
 */
export const imageDataAsUnsignedChar = ( imageData: ImageData, wasmInstance: WasmFilterInstance,
    fn: ProcessFn ): Uint8ClampedArray => {

    const { length } = imageData.data;

    // allocate and set ImageData into WASM memory
    const memory = wasmInstance._malloc( length );
    wasmInstance.HEAPU8.set( imageData.data, memory );

    // run WASM operations on char data
    fn( memory, length );

    // retrieve operation result to be returned to JS and free WASM memory
    const filteredPixels = wasmInstance.HEAPU8.subarray( memory, memory + length );
    wasmInstance._free( memory );

    return filteredPixels as never as Uint8ClampedArray;
};
