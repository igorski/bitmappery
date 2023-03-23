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
import CompressionWorker from "@/workers/compression.worker?worker";

type CompressionJob = {
    id: number;
    success: ( data: any ) => void;
    error: ( error: any ) => void;
};

const jobQueue: CompressionJob[] = [];
let UID = 0;

/**
 * Compress given data Object into an compressed binary Blob.
 */
export const compress = ( data: any ): Promise<Blob> => createJob( "compress", data );

/**
 * Decompress given data Blob into a JSON structure.
 */
export const decompress = ( data: Blob ): Promise<any> => createJob( "decompress", data );

/* internal methods */

function handleWorkerMessage({ data }: MessageEvent ): void {
    const jobQueueObj = getJobFromQueue( data?.id );
    if ( data?.cmd === "complete" ) {
        jobQueueObj?.success( data.data );
    }
    if ( data?.cmd === "loadError" ) {
        jobQueueObj?.error( data?.error );
    }
}

function createJob( cmd: string, data: any ): Promise<any> {
    return new Promise(( resolve, reject ) => {
        const id = ( ++UID );
        // Worker is lazily created per process so we can parallelize
        const worker = new CompressionWorker();
        worker.onmessage = handleWorkerMessage;
        const disposeWorker = () => worker.terminate();
        jobQueue.push({
            id,
            success: response => {
                disposeWorker();
                resolve( response );
            },
            error: error  => {
                disposeWorker();
                reject( error );
            }
        });
        worker.postMessage({ cmd, data, id });
    })
}

function getJobFromQueue( jobId: number ): CompressionJob {
    const jobQueueObj = jobQueue.find(({ id }) => id === jobId );
    if ( !jobQueueObj ) {
        return null;
    }
    jobQueue.splice( jobQueue.indexOf( jobQueueObj ), 1 );
    return jobQueueObj;
}
