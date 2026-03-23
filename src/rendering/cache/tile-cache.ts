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
import type { Document, RelId } from "@/definitions/document";
import { getPixelRatio, resizeImage } from "@/utils/canvas-util";
import { createGroupSnapshot } from "@/utils/document-util";

export const THUMB_HEIGHT = 50;

export type Tile = {
    source: HTMLCanvasElement;
    thumb: HTMLCanvasElement;
};
const tileCache = new Map<RelId, Tile>;

type SubscriberCallback = ( id: RelId, data: Tile ) => void;
const subscribers = new Map<string, SubscriberCallback>;

export const subscribe = ( subscriberId: string, callback: SubscriberCallback ): void => {
    if ( subscribers.has( subscriberId )) {
        return;
    }
    subscribers.set( subscriberId, callback );
};

export const unsubscribe = ( subscriberId: string ): void => {
    subscribers.delete( subscriberId );
};

export const createGroupTile = async ( id: RelId, document?: Document ): Promise<void> => {
    console.info( `creating tile for group ${id}` );

    const snapshot = await createGroupSnapshot( document, id );
    const thumb = await resizeImage(
        snapshot,
        snapshot.height / snapshot.width * ( THUMB_HEIGHT * getPixelRatio() ), THUMB_HEIGHT * getPixelRatio()
    );
    const tile = {
        source: snapshot,
        thumb, 
    }
    tileCache.set( id, tile );

    for ( const subscriber of subscribers.values() ) {
        subscriber( id, tile );
    }
};

export const hasTile = ( id: RelId ): boolean => tileCache.has( id );

export const getTileForGroup = ( id: RelId ): Tile | undefined => {
    return tileCache.get( id );
};

export const flushTileForGroup = ( id: RelId ): void => {
    console.info( `flushing tile for group ${id}` );
    tileCache.delete( id );
};

export const flushTileCache = (): void => {
    console.info( "flushing tile cache" );
    tileCache.clear();
};
