import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCanvasElement, createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import { BlendModes } from "@/definitions/blend-modes";
import ToolTypes from "@/definitions/tool-types";
import DocumentFactory from "@/factories/document-factory";
import TransformFactory from "@/factories/transform-factory";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { commitLayerEffectsAndTransforms } from "@/store/actions/layer-commit-effects-and-transforms";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

vi.mock( "@/utils/canvas-util", async ( importOriginal ) => {
    return {
        ...await importOriginal(),
        cloneCanvas: () => createMockCanvasElement(),
        cloneResized: ( _src: any, width: number, height: number ) => createMockCanvasElement( width, height ),
    }
});

const mockDocumentUtilSpy = vi.fn();
vi.mock( "@/utils/document-util", () => ({
    createLayerSnapshot: ( ...args: any[] ) => mockDocumentUtilSpy( "createLayerSnapshot", ...args )
}));

describe( "commit layer effects and transforms action", () => {
    const document = DocumentFactory.create();
    const layer    = LayerFactory.create({
        transform: TransformFactory.create({ rotation: 5, scale: 2 }),
        filters: FiltersFactory.create({ opacity: 0.5 }),
        source: createMockCanvasElement(),
        mask: createMockCanvasElement(),
        left: 100,
        top: 100,
        width: 200,
        height: 200,
        maskX: 10,
        maskY: 10,
    });
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        store.getters.activeTool = ToolTypes.LASSO;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should replace the Layer sources, transform, filters and coordinates, requesting a full renderer recreation", async () => {
        await commitLayerEffectsAndTransforms( store, document, layer, 0 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "updateLayer", {
            index: 0,
            opts: {
                transform: TransformFactory.create(),
                filters: FiltersFactory.create(),
                source: expect.any( Object ),
                mask: null,
                width: document.width,
                height: document.height,
                left: 0,
                top: 0,
                maskX: 0,
                maskY: 0,
            },
            recreateRenderer: true,
        });
    });

    it( "should store the action in state history", async () => {
        await commitLayerEffectsAndTransforms( store, document, layer, 1 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `commit_layer_fx_1`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original values when calling undo in state history", async () => {
        const { transform, filters, width, height, left, top, maskX, maskY } = layer;

        await commitLayerEffectsAndTransforms( store, document, layer, 0 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "updateLayer", {
            index: 0,
            opts: {
                transform, filters, source: expect.any( Object ), mask: expect.any( Object ), width, height, left, top, maskX, maskY
            },
            recreateRenderer: true,
        });
    });

    it( "should restore the replaced values when calling redo in state history", async () => {
        await commitLayerEffectsAndTransforms( store, document, layer, 0 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "updateLayer", {
            index: 0,
            opts: {
                transform: TransformFactory.create(),
                filters: FiltersFactory.create(),
                source: expect.any( Object ),
                mask: null,
                width: document.width,
                height: document.height,
                left: 0,
                top: 0,
                maskX: 0,
                maskY: 0,
            },
            recreateRenderer: true,
        });
    });

    describe( "when handling the provided Layers blend mode filter", () => {
        const blendLayer = LayerFactory.create({
            filters: FiltersFactory.create({ blendMode: BlendModes.LIGHTEN }),
        });

        it( "should ignore the blend mode for layers at the 0 index as there will be no visual difference", async () => {
            await commitLayerEffectsAndTransforms( store, document, blendLayer, 0 );

            // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
            expect( store.commit.mock.calls[ 0 ][ 1 ].opts.filters ).toEqual(
                FiltersFactory.create({ blendMode: BlendModes.NORMAL }),
            );
        });

        it( "should maintain the existing blend mode for layers above the first index", async () => {
            await commitLayerEffectsAndTransforms( store, document, blendLayer, 1 );

            // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
            expect( store.commit.mock.calls[ 0 ][ 1 ].opts.filters ).toEqual(
                FiltersFactory.create({ blendMode: BlendModes.LIGHTEN }),
            );
        });

        it( "should ignore the existing blend mode for layers above the first index with filters disabled", async () => {
            blendLayer.filters.enabled = false;

            await commitLayerEffectsAndTransforms( store, document, blendLayer, 1 );

            // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
            expect( store.commit.mock.calls[ 0 ][ 1 ].opts.filters ).toEqual(
                FiltersFactory.create({ blendMode: BlendModes.NORMAL }),
            );
        });
    });

    it.each([ "undo", "redo" ])
    ( `should not reset the active tool when it is not of the DRAG type for the "%s" action`,
    async ( action: string ) => {
        await commitLayerEffectsAndTransforms( store, document, layer, 0 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];

        ( action === "undo" ) ? undo() : redo();

        expect( store.commit ).not.toHaveBeenCalledWith( "setActiveTool", expect.any( Object ));
    });

    it.each([ "undo", "redo" ])
    ( `should reset the active tool when it is of the DRAG type for the "%s" action`,
    async ( action: string ) => {
        store.getters.activeTool = ToolTypes.DRAG;

        await commitLayerEffectsAndTransforms( store, document, layer, 0 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];

        ( action === "undo" ) ? undo() : redo();

        expect( store.commit ).toHaveBeenCalledWith( "setActiveTool", { tool: ToolTypes.DRAG });
    });
});