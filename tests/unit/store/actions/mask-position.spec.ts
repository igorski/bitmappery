import { it, afterEach, beforeEach, describe, expect, vi } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../../mocks";

mockZCanvas();

import { type Layer } from "@/definitions/document";
import LayerFactory from "@/factories/layer-factory";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import { positionMask } from "@/store/actions/mask-position";

const mockGetRendererForLayer = vi.fn();
vi.mock( "@/factories/renderer-factory", () => ({
    getRendererForLayer: vi.fn(( ...args ) => mockGetRendererForLayer( ...args )),
}));

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: vi.fn(( ...args ) => mockEnqueueState( ...args )),
}));

describe( "Layer mask positioning action", () => {
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

    describe( "When storing a Layer mask position as a history state", () => {
        const oldMaskX    = 5;
        const oldMaskY    = 6;
        const newMaskX    = 15;
        const newMaskY    = 16;

        it( "should enqueue the state in history", () => {
            positionMask( layer, oldMaskX, oldMaskY, newMaskX, newMaskY );
            expect( mockEnqueueState ).toHaveBeenCalledWith(
                 `maskPos_${layer.id}`, {
                    undo: expect.any( Function ),
                    redo: expect.any( Function )
                 }
            );
        });

        describe( "and calling the undo or redo state", () => {
            let undo: VoidFunction;
            let redo: VoidFunction;

            beforeEach(() => {
                positionMask( layer, oldMaskX, oldMaskY, newMaskX, newMaskY );
                ({ undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ]);
            });

            it.each([ "undo", "redo" ])
            ( `should restore the position of the mask for the "%s" action`, ( action: string ) => {
                layer.maskX = 1000;
                layer.maskY = 1000;

                ( action === "undo" ) ? undo() : redo();

                expect( layer.maskX ).toEqual( action === "undo" ? oldMaskX : newMaskX );
                expect( layer.maskY ).toEqual( action === "undo" ? oldMaskY : newMaskY );
            });

            it.each([ "undo", "redo" ])
            ( `should recache the renderers filter on the "%s" action`, ( action: string ) => {
                const rerenderSpy = vi.spyOn( layerRenderer, "resetFilterAndRecache" );

                ( action === "undo" ) ? undo() : redo();

                expect( rerenderSpy ).toHaveBeenCalled();
            });
        });
    });
});
