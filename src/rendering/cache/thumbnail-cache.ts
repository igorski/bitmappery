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
import type { Size } from "zcanvas";
import type { Document, Layer } from "@/definitions/document";
import { getPixelRatio, imageToBase64, resizeImage } from "@/utils/canvas-util";
import { SmartExecutor } from "@/utils/debounce-util";
import { createLayerSnapshot } from "@/utils/document-util";

export type Thumbnail = {
    source: string; // @todo element or Blob URL ?
    size: Size;
};

const thumbnailCache = new Map<string, Thumbnail>;
const renderQueue = new Map<string, Layer>();
let timeout: ReturnType<typeof setTimeout>;
let enabled = false;

type SubscriberCallback = ( layerId: string, data: string ) => void;
const subscribers = new Map<string, SubscriberCallback>;

export const TRANSPARENT_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
export const ENQUEUE_TIMEOUT = 1000;
const THUMB_WIDTH = 40;

export const subscribe = ( subscriberId: string, callback: SubscriberCallback ): void => {
    if ( subscribers.has( subscriberId )) {
        return;
    }
    subscribers.set( subscriberId, callback );
};

export const unsubscribe = ( subscriberId: string ): void => {
    subscribers.delete( subscriberId );
};

export const setEnabled = ( value: boolean ): void => {
    enabled = value;

    if ( !enabled ) {
        flushThumbnailCache();
        clearTimeout( timeout );
        renderQueue.clear();
    }
};

export const isEnabled = (): boolean => enabled;

export const createLayerThumbnail = async ( layer: Layer, force = false, document?: Document ): Promise<void> => {
    if ( !enabled ) {
        return;
    }
    let delay = ENQUEUE_TIMEOUT;

    if ( !thumbnailCache.has( layer.id )) {
        thumbnailCache.set( layer.id, {
            source: TRANSPARENT_IMAGE,
            size: {
                width: document?.width ?? layer.width,
                height: document?.height ?? layer.height,
            },
        });
        delay = 0; // instant render
    } else if ( !force ) {
        return; // keep existing data
    }
    
    if ( renderQueue.has( layer.id )) {
        renderQueue.set( layer.id, layer ); // update layer ref
        return; // render request is already pending for this layer
    } else if ( renderQueue.size > 0 ) {
        await processQueue(); // another set of requests was pending, process now
    }
    renderQueue.set( layer.id, layer );
    timeout = setTimeout( processQueue, delay );
};

export const hasThumbnail = ( layerId: string ): boolean => thumbnailCache.has( layerId );

export const getThumbnailForLayer = ( layerId: string ): string => {
    return thumbnailCache.get( layerId )?.source ?? TRANSPARENT_IMAGE;
};

export const flushThumbnailForLayer = ( layer: Layer ): void => {
    // console.info( "flushing thumbnail for layer " + layer.id );
    thumbnailCache.delete( layer.id );
};

export const flushThumbnailCache = (): void => {
    // console.info( "flushing thumbnail cache" );
    thumbnailCache.clear();
};

/* internal methods */

async function processQueue(): Promise<void> {
    clearTimeout( timeout );

    const smartExec = new SmartExecutor();
    const layerIds = [ ...renderQueue.keys() ];

    for ( const layerId of layerIds ) {
        const layer = renderQueue.get( layerId );
        renderQueue.delete( layerId );
        
        const thumbData = thumbnailCache.get( layerId );
        if ( thumbData === undefined ) {
            continue;
        }
        const width = THUMB_WIDTH * getPixelRatio();
        const height = width * ( thumbData.size.height / thumbData.size.width );

        // console.info( "creating thumbnail for layer " + layer.id);

        const snapshot = await createLayerSnapshot( layer, thumbData.size );

        thumbData.source = imageToBase64(
            await resizeImage( snapshot, width, height ), width, height, true
        );
        smartExec.waitWhenBusy();
        broadcastUpdate( layerId );
    }
}

function broadcastUpdate( layerId: string ): void {
    const thumbData = thumbnailCache.get( layerId );
    if ( !thumbData ) {
        return;
    }
    for ( const subscriber of subscribers.values() ) {
        subscriber( layerId, thumbData.source );
    }
}
