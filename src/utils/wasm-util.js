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

/**
 * Runs given fn (WASM function pointer) on given imageData
 * where the data is treated as float32 inside WASM.
 * Memory is allocated and freed accordingly.
 *
 * @param {ImageData} imageData
 * @param {WebAssembly.Instance} wasmInstance
 * @param {Function} fn function to execute with created WASM memory
 * @return {Uint8ClampedArray} processed imageData.data
 */
export const imageDataAsFloat = ( imageData, wasmInstance, fn ) => {
    const { length } = imageData.data;
    const sizeofFloat = Float32Array.BYTES_PER_ELEMENT;
    const memorySize  = length * sizeofFloat;

    // allocate and set ImageData into WASM memory
    const memory = wasmInstance._malloc( memorySize );
    wasmInstance.HEAPF32.set( imageData.data, memory / sizeofFloat );

    // run WASM operations on float32 data
    fn( memory, length );

    // retrieve operation result to be returned to JS and free WASM memory
    const processedImageData = wasmInstance.HEAPF32.subarray(
        memory / sizeofFloat,
        memory / sizeofFloat + length
    );
    wasmInstance._free( memory );

    return processedImageData;
};

/**
 * Runs given fn (WASM function pointer) on given imageData
 * where the data is treated as unsigned char (8-bit) inside WASM.
 * Memory is allocated and freed accordingly.
 *
 * @param {ImageData} imageData
 * @param {WebAssembly.Instance} wasmInstance
 * @param {Function} fn function to execute with created WASM memory
 * @return {Uint8ClampedArray} processed imageData.data
 */
export const imageDataAsUnsignedChar = ( imageData, wasmInstance, fn ) => {
    const { length } = imageData.data;

    // allocate and set ImageData into WASM memory
    const memory = wasmInstance._malloc( length );
    wasmInstance.HEAPU8.set( imageData.data, memory );

    // run WASM operations on char data
    fn( memory, length );

    // retrieve operation result to be returned to JS and free WASM memory
    const filteredPixels = wasmInstance.HEAPU8.subarray( memory, memory + length );
    wasmInstance._free( memory );

    return filteredPixels;
};
