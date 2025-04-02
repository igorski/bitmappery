import { it, afterEach, beforeEach, describe, expect, vi } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../../mocks";

mockZCanvas();

import { type Layer } from "@/definitions/document";
import LayerFactory from "@/factories/layer-factory";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import { positionLayer } from "@/store/actions/layer-position";

const mockGetRendererForLayer = vi.fn();
vi.mock( "@/factories/renderer-factory", () => ({
    getRendererForLayer: vi.fn(( ...args ) => mockGetRendererForLayer( ...args )),
}));

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: vi.fn(( ...args ) => mockEnqueueState( ...args )),
}));

const mockFlushBlendedLayerCache = vi.fn();
let mockUseBlendCaching = false;
vi.mock( "@/rendering/cache/blended-layer-cache", () => ({
    flushBlendedLayerCache: vi.fn(() => mockFlushBlendedLayerCache()),
    useBlendCaching: vi.fn(() => mockUseBlendCaching ),
    isBlendCached: vi.fn(),
}));

describe( "Layer positioning action", () => {
    let layer: Layer;
    let layerRenderer: LayerRenderer;

    beforeEach(() => {
        layer = LayerFactory.create({
            source: createMockCanvasElement(),
            mask: createMockCanvasElement(),
        });
        layerRenderer = new LayerRenderer( layer );
        mockGetRendererForLayer.mockReturnValue( layerRenderer );
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "When storing a Layer position as a history state", () => {
        const oldLayerX    = 5;
        const oldLayerY    = 6;
        const newLayerX    = 15;
        const newLayerY    = 16;
        const oldRendererX = 2;
        const oldRendererY = 3;
        const newRendererX = 7;
        const newRendererY = 8;

        it( "should enqueue the state in history", () => {
            positionLayer(
                layer, oldLayerX, oldLayerY, newLayerX, newLayerY,
                oldRendererX, oldRendererY, newRendererX, newRendererY
            );
            expect( mockEnqueueState ).toHaveBeenCalledWith(
                 `layerPos_${layer.id}`, {
                    undo: expect.any( Function ),
                    redo: expect.any( Function )
                 }
            );
        });

        describe( "and calling the undo or redo state", () => {
            let undo: VoidFunction;
            let redo: VoidFunction;

            beforeEach(() => {
                positionLayer(
                    layer, oldLayerX, oldLayerY, newLayerX, newLayerY,
                    oldRendererX, oldRendererY, newRendererX, newRendererY
                );
                ({ undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ]);
            });

            it.each([ "undo", "redo" ])
            ( `should restore the position of the layer for the "%s" action`, ( action: string ) => {
                layer.left = 1000;
                layer.top  = 1000;

                ( action === "undo" ) ? undo() : redo();

                expect( layer.left ).toEqual( action === "undo" ? oldLayerX : newLayerX );
                expect( layer.top ).toEqual( action === "undo" ? oldLayerY : newLayerY );
            });

            it.each([ "undo", "redo" ])
            ( `should update the existing bounds object directly without invoking the setter methods for the "%s" action`,
            ( action: string ) => {
                const bounds = layerRenderer.getBounds();
                const { width, height } = bounds;
        
                bounds.left = 1000;
                bounds.top  = 1000;
                
                ( action === "undo" ) ? undo() : redo();

                expect( bounds ).toEqual({
                    left: action === "undo" ? oldRendererX : newRendererX,
                    top: action === "undo" ? oldRendererY : newRendererY,
                    width,
                    height,
                });
            });

            it.each([ "undo", "redo" ])
            ( `should call the invalidate() method on the renderer to trigger a render for the "%s" action`, ( action: string ) => {
                const invalidateSpy = vi.spyOn( layerRenderer, "invalidate" );
        
                ( action === "undo" ) ? undo() : redo();

                expect( invalidateSpy ).toHaveBeenCalled();
            });

            it.each([ "undo", "redo" ])
            ( `should not invalidate the blended layer cache when blend caching is disabled for the "%s" action`, ( action: string ) => {
                mockUseBlendCaching = false;

                ( action === "undo" ) ? undo() : redo();
                
                expect( mockFlushBlendedLayerCache ).not.toHaveBeenCalled();
            });

            it.each([ "undo", "redo" ])
            ( `should invalidate the blended layer cache when blend caching is enabled for the "%s" action`, ( action: string ) => {
                mockUseBlendCaching = true;

                ( action === "undo" ) ? undo() : redo();
                
                expect( mockFlushBlendedLayerCache ).toHaveBeenCalled();
            });
        });
    });
});
