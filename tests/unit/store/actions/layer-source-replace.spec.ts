import { it, afterEach, beforeEach, describe, expect, vi } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../../mocks";

mockZCanvas();

import { type Layer } from "@/definitions/document";
import LayerFactory from "@/factories/layer-factory";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import { replaceLayerSource } from "@/store/actions/layer-source-replace";

const mockGetRendererForLayer = vi.fn();
vi.mock( "@/factories/renderer-factory", () => ({
    getRendererForLayer: vi.fn(( ...args ) => mockGetRendererForLayer( ...args )),
}));

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: vi.fn(( ...args ) => mockEnqueueState( ...args )),
}));

describe( "Layer source replacement action", () => {
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

    describe( "When changing a Layers source", () => {
        const MOCK_ORG_SOURCE = "blob:http://foo";
        const MOCK_NEW_SOURCE = "blob:http://bar";

        it( "should enqueue the state in history including a resources list", () => {
            replaceLayerSource( layer, MOCK_ORG_SOURCE, MOCK_NEW_SOURCE, true );
            expect( mockEnqueueState ).toHaveBeenCalledWith(
                 `layerSource_${layer.id}`, {
                    undo: expect.any( Function ),
                    redo: expect.any( Function ),
                    resources: [ MOCK_ORG_SOURCE, MOCK_NEW_SOURCE ],
                 }
            );
        });

        describe( "and calling the undo or redo state", () => {
            let setSourceSpy;
            let loadedSource: string;
            let undo: VoidFunction;
            let redo: VoidFunction;

            describe( "for a replace action outside of the Layer mask", () => {

                beforeEach(() => {
                    replaceLayerSource( layer, MOCK_ORG_SOURCE, MOCK_NEW_SOURCE, false );
                    ({ undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ]);

                    // instantly load an image on src assignment
                    setSourceSpy = vi.spyOn( global.Image.prototype, "src", "set" ).mockImplementation( function( _source: string ): void {
                        loadedSource = _source;
                        this.onload();
                    });
                });

                it.each([ "undo", "redo" ])
                ( `should set the layer source to the provided source value when restoring outside of the mask for the "%s" action`,
                ( action: string ) => {
                    const getMaskContextSpy = vi.spyOn( layer.mask, "getContext" );
        
                    ( action === "undo" ) ? undo() : redo();
        
                    expect( getMaskContextSpy ).not.toHaveBeenCalled();
        
                    expect( layer.source.getContext( "2d" ).drawImage ).toHaveBeenCalledWith( expect.any( global.Image ), 0, 0 );
                    
                    expect( loadedSource ).toEqual( action === "undo" ? MOCK_ORG_SOURCE : MOCK_NEW_SOURCE );
                });

                it.each([ "undo", "redo" ])
                ( `should request a filter invalidation and recache from the Layers renderer for the "%s" action`, ( action: string ) => {
                    const recacheSpy = vi.spyOn( layerRenderer, "resetFilterAndRecache" );
        
                    ( action === "undo" ) ? undo() : redo();
        
                    expect( recacheSpy ).toHaveBeenCalledWith();
                });
            });

            describe( "for a replace action of the Layer mask", () => {

                beforeEach(() => {
                    replaceLayerSource( layer, MOCK_ORG_SOURCE, MOCK_NEW_SOURCE, true );
                    ({ undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ]);

                    // instantly load an image on src assignment
                    setSourceSpy = vi.spyOn( global.Image.prototype, "src", "set" ).mockImplementation( function( _source: string ): void {
                        loadedSource = _source;
                        this.onload();
                    });
                });

                it.each([ "undo", "redo" ])
                ( `should set the layer mask to the provided source value when restoring inside of the mask for the "%s" action`,
                ( action: string ) => {
                    const getSourceContextSpy = vi.spyOn( layer.source, "getContext" );
                    
                    ( action === "undo" ) ? undo() : redo();
        
                    expect( getSourceContextSpy ).not.toHaveBeenCalled();
                    
                    expect( layer.mask.getContext( "2d" ).drawImage ).toHaveBeenCalledWith( expect.any( global.Image ), 0, 0 );

                    expect( loadedSource ).toEqual( action === "undo" ? MOCK_ORG_SOURCE : MOCK_NEW_SOURCE );
                });

                it.each([ "undo", "redo" ])
                ( `should request a filter invalidation and recache from the Layers renderer for the "%s" action`,
                ( action: string ) => {
                    const recacheSpy = vi.spyOn( layerRenderer, "resetFilterAndRecache" );
        
                    ( action === "undo" ) ? undo() : redo();
        
                    expect( recacheSpy ).toHaveBeenCalledWith();
                });
            });
        });
    });
});
