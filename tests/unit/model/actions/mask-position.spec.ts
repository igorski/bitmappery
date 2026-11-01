import { it, afterEach, beforeEach, describe, expect, vi } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../../mocks";

mockZCanvas();

import { type Layer } from "@/model/types/layer";
import LayerFactory from "@/model/factories/layer-factory";
import MaskFactory from "@/model/factories/mask-factory";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import { positionMask } from "@/model/actions/mask-position";

const mockGetRendererForLayer = vi.fn();
vi.mock( "@/model/factories/renderer-factory", () => ({
    getRendererForLayer: vi.fn(( ...args ) => mockGetRendererForLayer( ...args )),
}));

const mockEnqueueState = vi.fn();
vi.mock( "@/model/factories/history-state-factory", () => ({
    enqueueState: vi.fn(( ...args ) => mockEnqueueState( ...args )),
}));

describe( "Layer mask positioning action", () => {
    const oldLeft = 5;
    const oldTop  = 6;
    const newLeft = 15;
    const newTop  = 16;
    
    let layer: Layer;
    let layerRenderer: LayerRenderer;

    beforeEach(() => {
        layer = LayerFactory.create({
            source: createMockCanvasElement(),
            mask: MaskFactory.create({
                source: createMockCanvasElement(),
                left: oldLeft,
                top: oldTop,
            }),
        });
        layerRenderer = new LayerRenderer( layer );
        mockGetRendererForLayer.mockReturnValue( layerRenderer );
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should update the Layers mask position", () => {
        positionMask( layer, newLeft, newTop );

        expect( layer.mask.left ).toEqual( newLeft );
        expect( layer.mask.top ).toEqual( newTop );
    });

    it( "should enqueue the state in history", () => {
        positionMask( layer, newLeft, newTop );

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
            positionMask( layer, newLeft, newTop );
            ({ undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ]);
        });

        it.each([ "undo", "redo" ])
        ( `should restore the position of the mask for the "%s" action`, ( action: string ) => {
            layer.mask.left = 1000;
            layer.mask.top = 1000;

            ( action === "undo" ) ? undo() : redo();

            expect( layer.mask.left ).toEqual( action === "undo" ? oldLeft : newLeft );
            expect( layer.mask.top ).toEqual( action === "undo" ? oldTop : newTop );
        });

        it.each([ "undo", "redo" ])
        ( `should recache the renderers filter on the "%s" action`, ( action: string ) => {
            const rerenderSpy = vi.spyOn( layerRenderer, "resetFilterAndRecache" );

            ( action === "undo" ) ? undo() : redo();

            expect( rerenderSpy ).toHaveBeenCalled();
        });
    });
});
