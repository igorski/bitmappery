/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
import { loader } from "zcanvas";
import type { SizedImage } from "zcanvas";
import { blobToResource, disposeResource } from "@/utils/resource-manager";
import FileToResourceWorker from "@/workers/image-file-to-resource.worker?worker";

type ImageLoadRequest = {
    name: string;
    success: ( data: SizedImage ) => void;
    error: ( fileName: string, error: Error ) => void;
};
const imageLoadQueue: ImageLoadRequest[] = [];

type FileLoadCallback = ( file: File, data: SizedImage ) => void;

/**
 * We can use a Worker to load the files to bitmaps so we can retrieve
 * their dimensions upfront. This requires createImageBitmap() availability.
 * Using this has yielded a speedup of 350 % in Chrome.
 * Ironically, Safari yields a 3500 % speedup without the Worker. Eitherway,
 * loading large queues should maintain responsiveness of the application.
 */
let _worker: Worker = undefined;
const getWorker = (): Worker => {
    if ( _worker === undefined && typeof window.createImageBitmap === "function" ) {
        _worker = new FileToResourceWorker();
        _worker.onmessage = handleWorkerMessage;
    }
    return _worker;
};

/**
 * Load a list of Image files in series in a way that ensures the main execution
 * stack won't be flooded with heavy operations.
 * Each File will generate a Blob URL pointing to the resource and contain
 * a size description in the form of image width and height.
 *
 * @param {File[]} fileList of images
 * @param {FileLoadCallback} callback to execute for each loaded file
 */
export const loadImageFiles = ( fileList: File[], callback: FileLoadCallback ): Promise<void[]> => {
    const promises = [];
    for ( let i = 0; i < fileList.length; ++i ) {
        const file = fileList[ i ];
        promises.push( loadFile( file, callback ));
    }
    return Promise.all( promises );
};

/* internal methods */

function loadFile( file: File, callback: FileLoadCallback ): Promise<void> {
    const worker = getWorker();
    if ( worker ) {
        return new Promise(( resolve, reject ) => {
            imageLoadQueue.push({
                name: file.name,
                success: ( data: SizedImage ) => {
                    callback( file, data );
                    resolve();
                },
                error: reject,
            });
            worker.postMessage({ cmd: "loadImageFile", file });
        });
    } else {
        return new Promise( async ( resolve, reject ) => {
            let imageSource;
            try {
                imageSource = blobToResource( file );
                const result = await loader.loadImage( imageSource );
                await callback( file, result );
                resolve( result );
            } catch {
                disposeResource( imageSource );
                reject();
            }
        });
    }
}

function handleWorkerMessage({ data }: MessageEvent ): void {
    const fileQueueObj = getFileFromQueue( data?.file );
    if ( data?.cmd === "loadComplete" ) {
        const { blobUrl, width, height }: { blobUrl: string, width: number, height: number } = data;
        const image = new Image();
        image.src = blobUrl;
        fileQueueObj?.success({ image, size: { width, height } });
    }
    if ( data?.cmd === "loadError" ) {
        fileQueueObj?.error( data.file, data?.error );
    }
}

function getFileFromQueue( fileName: string ): ImageLoadRequest {
    const fileQueueObj = imageLoadQueue.find(({ name }) => name === fileName );
    if ( !fileQueueObj ) {
        return null;
    }
    imageLoadQueue.splice( imageLoadQueue.indexOf( fileQueueObj ), 1 );
    return fileQueueObj;
}
