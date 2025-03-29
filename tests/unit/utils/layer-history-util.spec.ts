import { it, afterEach, beforeEach, describe, expect, vi } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../mocks";

mockZCanvas();

import { type Layer } from "@/definitions/document";
import LayerFactory from "@/factories/layer-factory";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import { storeLayerPositionInHistory, storeMaskPositionInHistory, storePaintInHistory } from "@/utils/layer-history-util";

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

describe( "Layer history utilities", () => {
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

    describe( "When storing a Layer renderers position as a history state", () => {
        const oldLayerX    = 5;
        const oldLayerY    = 6;
        const newLayerX    = 15;
        const newLayerY    = 16;
        const oldRendererX = 2;
        const oldRendererY = 3;
        const newRendererX = 7;
        const newRendererY = 8;

        it( "should enqueue the state in history", () => {
            storeLayerPositionInHistory(
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
                storeLayerPositionInHistory(
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

    describe( "When storing a Layer mask position as a history state", () => {
        const oldMaskX    = 5;
        const oldMaskY    = 6;
        const newMaskX    = 15;
        const newMaskY    = 16;

        it( "should enqueue the state in history", () => {
            storeMaskPositionInHistory( layer, oldMaskX, oldMaskY, newMaskX, newMaskY );
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
                storeMaskPositionInHistory( layer, oldMaskX, oldMaskY, newMaskX, newMaskY );
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

    describe( "When storing a paint operation into state history", () => {
        const MOCK_ORG_SOURCE = "blob:http://foo";
        const MOCK_NEW_SOURCE = "blob:http://bar";

        it( "should enqueue the state in history including a resources list", () => {
            storePaintInHistory( layer, MOCK_ORG_SOURCE, MOCK_NEW_SOURCE, true );
            expect( mockEnqueueState ).toHaveBeenCalledWith(
                 `layerPaint_${layer.id}`, {
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

            describe( "for a paint action outside of the Layer mask", () => {

                beforeEach(() => {
                    storePaintInHistory( layer, MOCK_ORG_SOURCE, MOCK_NEW_SOURCE, false );
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

            describe( "for a paint action inside the Layer mask", () => {

                beforeEach(() => {
                    storePaintInHistory( layer, MOCK_ORG_SOURCE, MOCK_NEW_SOURCE, true );
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
