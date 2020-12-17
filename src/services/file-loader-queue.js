/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
import { loader }      from "zcanvas";
import ImageFileWorker from "@/services/image-file-to-resource.worker";

/**
 * We can use a Worker to load the files to bitmaps so we can retrieve
 * their dimensions upfront. This requires createImageBitmap() availability.
 * Using this has yielded a speedup of 350 % in Chrome.
 * Ironically, Safari yields a 3500 % speedup without the Worker. Eitherway,
 * loading large queues should maintain responsiveness of the application.
 */
let worker;
if ( typeof window.createImageBitmap === "function" ) {
    worker = new ImageFileWorker();
    worker.onmessage = handleWorkerMessage;
}
const imageLoadQueue = [];

/**
 * Load a list of Image files in series in a way that ensures the main execution
 * stack won't be flooded with heavy operations.
 * Each File will generate a Blob URL pointing to the resource and contain
 * a size description in the form of image width and height.
 *
 * @param {FileList} fileList of images
 * @param {Function} callback to execute for each loaded file (receives file and zCanvas load result as arguments)
 * @param {ctx} Vue component instance used for debouncing synced to the Vue render task queue
 */
export const loadImageFiles = ( fileList, callback, ctx ) => {
    const promises = [];
    for ( let i = 0; i < fileList.length; ++i ) {
        const file = fileList[ i ];
        promises.push( loadFile( file, callback, ctx ));
    }
    return Promise.all( promises );
};

/* internal methods */

function loadFile( file, callback, ctx ) {
    if ( worker ) {
        return new Promise(( resolve, reject ) => {
            imageLoadQueue.push({
                name: file.name,
                success: async data => {
                    callback( file, data );
                    resolve();
                },
                error: reject,
            });
            worker.postMessage({ cmd: "loadImageFile", file });
        })
    } else {
        return new Promise( async ( resolve, reject ) => {
            try {
                const imageSource = URL.createObjectURL( file );
                const result = await loader.loadImage( imageSource );
                await callback( file, result );
                resolve( result );
            } catch {
                URL.revokeObjectURL( imageSource );
                reject();
            }
        });
    }
}

function handleWorkerMessage({ data }) {
    const fileQueueObj = getFileFromQueue( data?.file );
    if ( data?.cmd === "loadComplete" ) {
        const { file, blobUrl, width, height } = data;
        const image = new Image();
        image.src = blobUrl;
        fileQueueObj?.success({ image, size: { width, height } });
    }
    if ( data?.cmd === "loadError" ) {
        fileQueueObj?.reject( file, data?.error );
    }
}

function getFileFromQueue( fileName ) {
    const fileQueueObj = imageLoadQueue.find(({ name }) => name === fileName );
    if ( !fileQueueObj ) {
        return null;
    }
    imageLoadQueue.splice( imageLoadQueue.indexOf( fileQueueObj ), 1 );
    return fileQueueObj;
}