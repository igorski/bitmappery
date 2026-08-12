import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockZoomableCanvas, mockZCanvas } from "../mocks";
import { type Layer } from "@/model/types/layer";
import FiltersFactory from "@/model/factories/filters-factory";
import LayerFactory, { type LayerProps } from "@/model/factories/layer-factory";
import { createRendererForLayer, flushRendererCache } from "@/model/factories/renderer-factory";
import type LayerRenderer from "@/rendering/actors/layer-renderer";
import { type FilterWorkerMessageData, type IFilterWorker } from "@/rendering/types";
import { freeWorker, renderEffectsForLayer, reserveWorker, updateWorker } from "@/services/render-service";

mockZCanvas();

vi.mock( "@/utils/canvas-util", async () => {
    const { createMockCanvasElement, createMockCanvasRenderingContext2D } = await vi.importActual( "../mocks" );
    return {
        createCanvas: vi.fn(() => {
            return {
                cvs: ( createMockCanvasElement as Function )(),
                ctx: ( createMockCanvasRenderingContext2D as Function )(),
            };
        }),
        cloneImageData: vi.fn(() => {}),
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
    let layerRenderer: LayerRenderer;

    function createLayer( props: LayerProps = {} ): Layer {
        const layer = LayerFactory.create( props );
        layerRenderer = createRendererForLayer( createMockZoomableCanvas(), layer, false, false  );   
        
        return layer;
    }

    beforeAll(() => {
        // @ts-expect-error TS2322 we just need a class instance
        global.ImageData = function() {};
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
            it( "should request a filter render process for the Layer in the spawned Worker", () => {
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
                    // @ts-expect-error TS2684: The 'this' context of type 'IFilterWorker' is not assignable to method's 'this' of type 'Worker'
                    mockWorkerInstance.onmessage({ data: { id: data.id, cmd: "error" } });
                });
                const result = await renderEffectsForLayer( newLayer );

                expect( result.status ).toEqual( "errored" );
            });

            it( "should complete the task successfully when the filter application succeeds", async () => {
                const newLayer = createLayer({ filters: activeFilterSettings });

                mockWorkerPostMessage.mockImplementationOnce(( data: FilterWorkerMessageData ) => {
                    // @ts-expect-error TS2684: The 'this' context of type 'IFilterWorker' is not assignable to method's 'this' of type 'Worker'
                    mockWorkerInstance.onmessage({ data: { id: data.id, cmd: "complete" } });
                });
                const result = await renderEffectsForLayer( newLayer );

                expect( result.status ).toEqual( "completed" );
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

            freeWorker( workerId );

            expect( mockWorkerInstance.terminate ).toHaveBeenCalled();
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
});
