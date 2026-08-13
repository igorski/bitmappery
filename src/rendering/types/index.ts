/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
import { type Filters } from "@/model/types/filters";

export type RenderStatus = "init" | "completed" | "cancelled" | "errored";

export type RenderResult = {
    status: RenderStatus;
    start: number;
    end: number;
    duration: number;
    jobId?: number; // run id of filter job, when executed
    error?: string; // optional error message when status is "errored"
};

export class RenderCancelError extends Error {};

export type RenderJob = {
    id: number;
    layerId: string;
    success: ( data: FilterWorkerMessageResult ) => void;
    error: ( error?: any ) => void;
    after?: () => void;
};

export type FilterWorkerMessageData = {
    cmd: "reserve" | "initWasm" | "filter" | "filterWasm";
    id?: number; // only on "filter" and "filterWasm" (see RenderResult.jobId)
    sourceId?: string; // only on "reserve" and optionally on "filter"
    imageData?: ImageData; // only on "reserve", "filter" and "filterWasm" cmd types
    filters?: Filters; // only on "filter" and "filterWasm" cmd types
    wasmUrl?: string; // only on "initWasm" cmd types
};

export type FilterWorkerMessageResult = {
    cmd: "ready" | "complete" | "error";
    id?: number; // only on "complete" and "error"
    pixelData?: Uint8ClampedArray; // only on "complete" cmd
    error?: any; // only on "error" cmd
};

export interface IFilterWorker extends Omit<Worker, "postMessage"> {
    postMessage( data: FilterWorkerMessageData, transfer?: Transferable[] ): void;
}
