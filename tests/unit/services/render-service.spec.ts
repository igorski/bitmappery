import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockImageData, createMockZoomableCanvas, mockZCanvas } from "../mocks";
import { type Layer } from "@/model/types/layer";
import FiltersFactory from "@/model/factories/filters-factory";
import LayerFactory, { type LayerProps } from "@/model/factories/layer-factory";
import { createRendererForLayer, flushRendererCache } from "@/model/factories/renderer-factory";
import { type FilterWorkerMessageData, type FilterWorkerMessageResult, type IFilterWorker } from "@/rendering/types";
import { freeWorker, renderEffectsForLayer, reserveWorker, updateWorker } from "@/services/render-service";

mockZCanvas();

vi.mock( "@/utils/canvas-util", async () => {
    const { createMockCanvasElement, createMockCanvasRenderingContext2D, createMockImageData } = await vi.importActual( "../mocks" );
    return {
        createCanvas: vi.fn(() => {
            return {
                cvs: ( createMockCanvasElement as Function )(),
                ctx: ( createMockCanvasRenderingContext2D as Function )(),
            };
        }),
        cloneImageData: vi.fn(() => ( createMockImageData as Function )() ),
    };
});

const mockWorkerPostMessage = vi.fn();
let mockWorkerInstance: IFilterWorker;
vi.mock( "@/workers/filter.worker?worker", () => ({
    default: vi.fn(() => {
        mockWorkerInstance = {
            postMessage: vi.fn(( ...args ) => mockWorkerPostMessage( ...args )),
            terminate: vi.fn(),
            onmessage: null,
        } as unknown as IFilterWorker;
        return mockWorkerInstance;
    }),
}));

describe( "Render service", () => {
    const activeFilterSettings = FiltersFactory.create({ enabled: true, gamma: 2 } );

    function createLayer( props: LayerProps = {} ): Layer {
        const layer = LayerFactory.create( props );
        createRendererForLayer( createMockZoomableCanvas(), layer, false, false  );   
        
        return layer;
    }

    function mockWorkerResponse( id: number, success = true ): void {
        const response: FilterWorkerMessageResult = { id, cmd: "error" };
        if ( success ) {
            response.cmd = "complete";
            response.pixelData = new Uint8ClampedArray();
        }
        const messageResult = { data: response } as MessageEvent<FilterWorkerMessageResult>;
        // @ts-expect-error TS2684: The 'this' context of type 'IFilterWorker' is not assignable to method's 'this' of type 'Worker'
        mockWorkerInstance.onmessage( messageResult );
    }

    beforeAll(() => {
        global.ImageData = vi.fn(() => createMockImageData());
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });
    
    afterEach(() => {
        vi.resetAllMocks();
        flushRendererCache();
    });
    
    describe( "When requesting the rendering of effects for a Layer", () => {
        describe( "and no renderer exists for the provided Layer", () => {
            it( "should cancel the task", async () => {
                const newLayer = LayerFactory.create();

                const result = await renderEffectsForLayer( newLayer );

                expect( result.status ).toEqual( "cancelled" );
            });
        });

        describe( "and no filtering needs to be applied to the Layer", () => {
            it( "should complete the task and not spawn a Worker to render a filter process", async () => {
                const newLayer = createLayer();

                const result = await renderEffectsForLayer( newLayer );

                expect( result.status ).toEqual( "completed" );
                expect( mockWorkerPostMessage ).not.toHaveBeenCalled();
            });
        });

        describe( "and filtering needs to be applied to the Layer", () => {
            it( "should request a filter render process for the Layer", () => {
                const newLayer = createLayer({ filters: activeFilterSettings });

                let receivedMessage;
                mockWorkerPostMessage.mockImplementationOnce(( data: FilterWorkerMessageData ) => {
                    receivedMessage = data;
                });
                renderEffectsForLayer( newLayer );

                expect( receivedMessage ).toEqual({
                    cmd: "filter",
                    filters: newLayer.filters,
                    id: expect.any( Number ),
                    imageData: expect.any( Object ),
                });
            });

            it( "should complete the task with an error when the filter application fails", async () => {
                const newLayer = createLayer({ filters: activeFilterSettings });

                mockWorkerPostMessage.mockImplementationOnce(( data: FilterWorkerMessageData ) => {
                    mockWorkerResponse( data.id, false );
                });

                const result = await renderEffectsForLayer( newLayer );

                expect( result.status ).toEqual( "errored" );
            });

            it( "should complete the task successfully when the filter application succeeds", async () => {
                const newLayer = createLayer({ filters: activeFilterSettings });

                mockWorkerPostMessage.mockImplementationOnce(( data: FilterWorkerMessageData ) => {
                    mockWorkerResponse( data.id, true );
                });

                const result = await renderEffectsForLayer( newLayer );

                expect( result.status ).toEqual( "completed" );
            });

            describe( "and when managing a cache", () => {
                it( "should request a filter render process for the Layer on each invocation when re-requesting without cache", async () => {
                    const newLayer = createLayer({ filters: activeFilterSettings });

                    mockWorkerPostMessage.mockImplementation(( data: FilterWorkerMessageData ) => {
                        mockWorkerResponse( data.id, true );
                    });

                    await renderEffectsForLayer( newLayer, true );
                    await renderEffectsForLayer( newLayer, false );

                    expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 2 );
                });

                it( "should request a filter render process for the Layer only once when re-requesting from cache", async () => {
                    const newLayer = createLayer({ filters: activeFilterSettings });

                    mockWorkerPostMessage.mockImplementation(( data: FilterWorkerMessageData ) => {
                        mockWorkerResponse( data.id, true );
                    });

                    await renderEffectsForLayer( newLayer, true );
                    const lastResult = await renderEffectsForLayer( newLayer, true );

                    expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 1 );
                    expect( lastResult.status ).toEqual( "completed" );
                });

                it( "should request a filter render process for the Layer again when re-requesting from cache with updated filter settings", async () => {
                    const newLayer = createLayer({ filters: activeFilterSettings });

                    mockWorkerPostMessage.mockImplementation(( data: FilterWorkerMessageData ) => {
                        mockWorkerResponse( data.id, true );
                    });

                    await renderEffectsForLayer( newLayer, true );

                    newLayer.filters.gamma = 1; // adjust filter settings (making cache outdated)
                    const lastResult = await renderEffectsForLayer( newLayer, true );

                    expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 2 );
                    expect( lastResult.status ).toEqual( "completed" );
                });

                it( "should not have written a previous render to the cache when it was deliberately requested to omit caching", async () => {
                    const newLayer = createLayer({ filters: activeFilterSettings });

                    mockWorkerPostMessage.mockImplementation(( data: FilterWorkerMessageData ) => {
                        mockWorkerResponse( data.id, true );
                    });

                    await renderEffectsForLayer( newLayer, false );
                    await renderEffectsForLayer( newLayer, true );

                    expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 2 );
                });
            });
        });
    });

    describe( "when using persisted Workers per Layer", () => {
        let layer1: Layer;
        let workerId: string;

        beforeEach(() => {
            layer1 = createLayer();
        });

        afterEach(() => {
            freeWorker( workerId );
        });

        it( "should create a Worker and post the source ImageData", () => {
            workerId = reserveWorker( layer1 );

            expect( mockWorkerPostMessage ).toHaveBeenCalledWith({
                cmd: "reserve",
                sourceId: layer1.id,
                imageData: expect.any( Object ),
            }, [ expect.any( Object )]);
        });

        it( "should not create the Worker twice for the same Layer", () => {
            workerId = reserveWorker( layer1 );
            reserveWorker( layer1 );

            expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 1 );
        });

        it( "should be able to terminate the Worker for the Layer", () => {
            workerId = reserveWorker( layer1 );

            const freed = freeWorker( workerId );

            expect( mockWorkerInstance.terminate ).toHaveBeenCalled();
            expect( freed ).toBe( true );
        });

        it( "should delay termination of the Worker when its still processing a job and first complete the current job", async () => {
            workerId = reserveWorker( layer1 );
            
            layer1.filters = activeFilterSettings;

            let jobId: number;
            mockWorkerPostMessage.mockImplementationOnce(( data: FilterWorkerMessageData ) => {
                jobId = data.id; // capture job id
            });
            
            const renderPromise = renderEffectsForLayer( layer1 );

            const freed = freeWorker( workerId );

            expect( freed ).toBe( false );
            expect( mockWorkerInstance.terminate ).not.toHaveBeenCalled();

            mockWorkerResponse( jobId!, true ); // complete render
            const result = await renderPromise;

            expect( mockWorkerInstance.terminate ).toHaveBeenCalled();
            expect( result.status ).toEqual( "completed" );
        });

        it( "should be able to recreate the Worker for a Layer that has a previously terminated one", () => {
            workerId = reserveWorker( layer1 );

            freeWorker( workerId );
            reserveWorker( layer1 );

            expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 2 );
        });

        it( "should be able to update the source ImageData in the existing Worker", () => {
            workerId = reserveWorker( layer1 );

            updateWorker( layer1 );

            expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 2 );
            expect( mockWorkerPostMessage ).toHaveBeenLastCalledWith({
                cmd: "reserve",
                sourceId: layer1.id,
                imageData: expect.any( Object ),
            }, [ expect.any( Object )]);
        });

        it( "should be able to have multiple Workers, one for each Layer", () => {
            const layer2 = createLayer();

            workerId = reserveWorker( layer1 );
            const worker2id = reserveWorker( layer2 );

            expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 2 );
            expect( mockWorkerPostMessage ).toHaveBeenNthCalledWith( 1, {
                cmd: "reserve",
                sourceId: layer1.id,
                imageData: expect.any( Object ),
            }, [ expect.any( Object )]);

            expect( mockWorkerPostMessage ).toHaveBeenNthCalledWith( 2, {
                cmd: "reserve",
                sourceId: layer2.id,
                imageData: expect.any( Object ),
            }, [ expect.any( Object )]);

            freeWorker( worker2id ); // cleanup
        });
    });

    describe( "when requesting the rendering of effects for a Layer with filters and a persisted Worker", () => {
        let layer: Layer;
        let workerId: string;

        beforeEach(() => {
            layer = createLayer({ filters: activeFilterSettings });
            workerId = reserveWorker( layer );

            mockWorkerPostMessage.mockReset();
        });

        afterEach(() => {
            freeWorker( workerId );
        });

        it( "should complete successfully", async () => {
            mockWorkerPostMessage.mockImplementationOnce(( data: FilterWorkerMessageData ) => {
                mockWorkerResponse( data.id, true );
            });

            const result = await renderEffectsForLayer( layer );

            expect( result.status ).toEqual( "completed" );
        });

        it( "should execute subsequent requests in a queue", async () => {
            const result1promise = renderEffectsForLayer( layer );
            const result2promise = renderEffectsForLayer( layer );

            vi.runAllTimers(); // runs RAF between jobs (just sanity checking)

            expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 1 );

            const job1id = mockWorkerPostMessage.mock.calls[ 0 ][ 0 ].id;
            mockWorkerResponse( job1id, true );

            expect(( await result1promise ).status ).toEqual( "completed" );
            
            vi.runAllTimers(); // runs RAF between jobs

            expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 2 );

            const job2id = mockWorkerPostMessage.mock.calls[ 1 ][ 0 ].id;
            mockWorkerResponse( job2id, true );

            expect(( await result2promise ).status ).toEqual( "completed" );
        });

        it( "should cancel requests in between the currently running and last queued job", async () => {
            const result1promise = renderEffectsForLayer( layer );
            const result2promise = renderEffectsForLayer( layer );
            const result3promise = renderEffectsForLayer( layer );
            const result4promise = renderEffectsForLayer( layer );

            expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 1 );

            // inner requests should be instantly cancelled
            expect(( await result2promise ).status ).toEqual( "cancelled" );
            expect(( await result3promise ).status ).toEqual( "cancelled" );

            const firstJobId = mockWorkerPostMessage.mock.calls[ 0 ][ 0 ].id;
            mockWorkerResponse( firstJobId, true );

            expect(( await result1promise ).status ).toEqual( "completed" );
            
            vi.runAllTimers(); // runs RAF between jobs

            expect( mockWorkerPostMessage ).toHaveBeenCalledTimes( 2 );

            const lastJobId = mockWorkerPostMessage.mock.calls[ 1 ][ 0 ].id;
            mockWorkerResponse( lastJobId, true );

            expect(( await result4promise ).status ).toEqual( "completed" );
        });
    });
});
