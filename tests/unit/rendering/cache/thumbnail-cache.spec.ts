import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { flushPromises, mockZCanvas } from "../../mocks";
mockZCanvas();

import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import {
    ENQUEUE_TIMEOUT,
    createLayerThumbnail,
    hasThumbnail,
    flushThumbnailForLayer,
    flushThumbnailCache,
    getThumbnailForLayer,
    isEnabled,
    setEnabled,
    subscribe,
    TRANSPARENT_IMAGE,
    unsubscribe,
} from "@/rendering/cache/thumbnail-cache";

vi.mock( "@/utils/document-util", () => ({
    createLayerSnapshot: vi.fn().mockResolvedValue(({})),
}));

vi.mock( "@/utils/canvas-util", async ( importOriginal ) => ({
    ...await importOriginal(),
    imageToBase64: vi.fn().mockReturnValue( "data:image/png;base64," ),
    resizeImage: vi.fn().mockResolvedValue( {} ),
}))

describe( "Thumbnail cache", () => {
    let setTimeoutSpy: MockInstance<typeof setTimeout>;
    let clearTimeoutSpy: MockInstance<typeof clearTimeout>;

    const layer = LayerFactory.create();
    const document = DocumentFactory.create();

    beforeEach(() => {
        vi.useFakeTimers();
        setTimeoutSpy = vi.spyOn( global, "setTimeout" );
        clearTimeoutSpy = vi.spyOn( global, "clearTimeout" );
    });

    afterEach(() => {
        flushThumbnailCache();
        setEnabled( false );
        vi.useRealTimers();
    });

    describe( "when toggling the enabled state of the cache", () => {
        it( "should by default be disabled", () => {
            expect( isEnabled() ).toBe( false );
        });

        it( "should cache thumbnails when enabled", () => {
            setEnabled( true );

            expect( isEnabled() ).toBe( true );
        });

        it( "should unset the existing cache when disabling a previously enabled cache", async () => {
            setEnabled( true );

            await createLayerThumbnail( layer, true, document );
            vi.advanceTimersByTime( ENQUEUE_TIMEOUT );

            setEnabled( false );

            expect( hasThumbnail( layer.id )).toBe( false );
        });

        it( "should not unset the enabled state when flushing the existing cache", async () => {
            setEnabled( true );

            await createLayerThumbnail( layer, true, document );
            flushThumbnailCache();

            expect( isEnabled() ).toBe( true );
        });
    });

    describe( "when subscribing to updates of the cache", () => {
        const SUBSCRIBE_TOKEN = "test";
        const updateFn = vi.fn();

        beforeEach(() => {
            setEnabled( true );
            subscribe( SUBSCRIBE_TOKEN, updateFn );
        });

        afterEach(() => {
            unsubscribe( SUBSCRIBE_TOKEN );
            updateFn.mockReset();
        });

        it( "should not receive an update on cache request as it is debounced", async () => {
            await createLayerThumbnail( layer, true, document );

            expect( updateFn ).not.toHaveBeenCalled();
        });

        it( "should receive an update on debounced cache completion", async () => {
            await createLayerThumbnail( layer, true, document );

            vi.advanceTimersByTime( ENQUEUE_TIMEOUT );  
            await flushPromises();

            expect( updateFn ).toHaveBeenCalledWith( layer.id, expect.any( String ));
        });

        describe( "when force caching is disabled", () => {
            it( "should receive an update when requesting to cache a Layer that was not cached before", async () => {
                await createLayerThumbnail( layer, false, document );
                
                vi.advanceTimersByTime( ENQUEUE_TIMEOUT );
                await flushPromises();

                expect( updateFn ).toHaveBeenCalledWith( layer.id, expect.any( String ));
            });

            it( "should not receive an update upon requesting to cache a Layer that was cached before", async () => {
                await createLayerThumbnail( layer, false, document );
                
                vi.advanceTimersByTime( ENQUEUE_TIMEOUT );
                await flushPromises();

                expect( updateFn ).toHaveBeenCalledWith( layer.id, expect.any( String ));
                updateFn.mockReset();

                await createLayerThumbnail( layer, false, document );
                
                vi.advanceTimersByTime( ENQUEUE_TIMEOUT );
                await flushPromises();
                
                expect( updateFn ).not.toHaveBeenCalled();
            });
        });

        it( "should no longer receive updates on unsubscribe", async () => {
            await createLayerThumbnail( layer, true, document );
            unsubscribe( SUBSCRIBE_TOKEN );

            vi.advanceTimersByTime( ENQUEUE_TIMEOUT );
            await flushPromises();

            expect( updateFn ).not.toHaveBeenCalled();
        });

        it( "should immediately cache pending jobs for other layers when a new layer is requested", async () => {
            const layer2 = LayerFactory.create();

            await createLayerThumbnail( layer, true, document );
            await createLayerThumbnail( layer2, true, document );

            expect( updateFn ).toHaveBeenCalledTimes( 1 ); // first layer already processed

            vi.advanceTimersByTime( ENQUEUE_TIMEOUT );  
            await flushPromises();

            expect( updateFn ).toHaveBeenCalledTimes( 2 ); // second layer processed by queue

            vi.advanceTimersByTime( ENQUEUE_TIMEOUT );  
            await flushPromises();

            expect( updateFn ).toHaveBeenCalledTimes( 2 ); // no new jobs were added
        });
    });

    describe( "when managing the thumbnail cache for a Layer", () => {
        it( "should by default not have a thumbnail when there is no cache", () => {
            expect( hasThumbnail( layer.id )).toBe( false );
        });

        it( "should not cache when the thumbnail cache is disabled", async () => {
            await createLayerThumbnail( layer, true, document );

            expect( hasThumbnail( layer.id )).toBe( false );
        });

        it( "should cache when the thumbnail cache is enabled", async () => {
            setEnabled( true );

            await createLayerThumbnail( layer, true, document );

            expect( hasThumbnail( layer.id )).toBe( true );
        });

        it( "should be able to remove the cache for an individual Layer", async () => {
            setEnabled( true );

            const layer2 = LayerFactory.create();

            await createLayerThumbnail( layer, true, document );
            await createLayerThumbnail( layer2, true, document );

            expect( hasThumbnail( layer.id )).toBe( true );
            expect( hasThumbnail( layer2.id )).toBe( true );

            flushThumbnailForLayer( layer );

            expect( hasThumbnail( layer.id )).toBe( false );
            expect( hasThumbnail( layer2.id )).toBe( true );
        });

        it( "should be able to remove the cache for all Layers", async () => {
            setEnabled( true );

            const layer2 = LayerFactory.create();

            await createLayerThumbnail( layer, true, document );
            await createLayerThumbnail( layer2, true, document );

            expect( hasThumbnail( layer.id )).toBe( true );
            expect( hasThumbnail( layer2.id )).toBe( true );

            flushThumbnailCache();

            expect( hasThumbnail( layer.id )).toBe( false );
            expect( hasThumbnail( layer2.id )).toBe( false );
        });
    });

    describe( "when caching and retrieving a layers thumbnail", () => {
        it( "should by default retrieve a transparent image when the thumbnail isn't cached yet", () => {
            expect( getThumbnailForLayer( layer.id )).toEqual( TRANSPARENT_IMAGE );
        });

        it( "should return a thumbnail image when the caching has completed", async () => {
            setEnabled( true );

            await createLayerThumbnail( layer, true, document );

            vi.advanceTimersByTime( ENQUEUE_TIMEOUT );
            await flushPromises();
            
            const thumb = getThumbnailForLayer( layer.id );

            expect( thumb ).not.toEqual( TRANSPARENT_IMAGE );
            expect( thumb ).toEqual( "data:image/png;base64," );
        });
    });
});