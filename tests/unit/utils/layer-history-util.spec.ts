import { it, afterEach, beforeEach, describe, expect, vi } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../mocks";

mockZCanvas();

import LayerFactory from "@/factories/layer-factory";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import { positionRendererFromHistory, restorePaintFromHistory } from "@/utils/layer-history-util";

const mockGetRendererForLayer = vi.fn();
vi.mock( "@/factories/renderer-factory", () => ({
    getRendererForLayer: vi.fn(( ...args ) => mockGetRendererForLayer( ...args )),
}));

const mockFlushBlendedLayerCache = vi.fn();
let mockUseBlendCaching = false;
vi.mock( "@/rendering/cache/blended-layer-cache", () => ({
    flushBlendedLayerCache: vi.fn(() => mockFlushBlendedLayerCache()),
    useBlendCaching: vi.fn(() => mockUseBlendCaching ),
    isBlendCached: vi.fn(),
}));

describe( "Layer history utilities", () => {
    const layer = LayerFactory.create({
        source: createMockCanvasElement(),
        mask: createMockCanvasElement(),
    });
    let layerRenderer: LayerRenderer;

    beforeEach(() => {
        layerRenderer = new LayerRenderer( layer );
        mockGetRendererForLayer.mockReturnValue( layerRenderer );
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "When adjusting a Layer renderers position from a history state", () => {
        it( "should update the existing bounds object directly without invoking the setter methods", () => {
            const orgBounds = layerRenderer.getBounds();
            const { width, height } = orgBounds;
       
            positionRendererFromHistory( layer, 5, 7 );

            expect( orgBounds ).toEqual({
                left: 5,
                top: 7,
                width,
                height,
            });
        });

        it( "should call the invalidate() method on the renderer to trigger a render", () => {
            const invalidateSpy = vi.spyOn( layerRenderer, "invalidate" );
       
            positionRendererFromHistory( layer, 5, 7 );

            expect( invalidateSpy ).toHaveBeenCalled();
        });

        it( "should not invalidate the blended layer cache when blend caching is disabled", () => {
            mockUseBlendCaching = false;

            positionRendererFromHistory( layer, 5, 7 );
            
            expect( mockFlushBlendedLayerCache ).not.toHaveBeenCalled();
        });

        it( "should invalidate the blended layer cache when blend caching is enabled", () => {
            mockUseBlendCaching = true;

            positionRendererFromHistory( layer, 5, 7 );
            
            expect( mockFlushBlendedLayerCache ).toHaveBeenCalled();
        });
    });

    describe( "When restoring a paint operation from state history", () => {
        const MOCK_SOURCE = "blob:http://foo";
        let setSourceSpy;

        beforeEach(() => {
            // instantly load an image on src assignment
            setSourceSpy = vi.spyOn( global.Image.prototype, "src", "set" ).mockImplementation( function( _source: string ): void {
                this.onload();
            });
        });

        it( "should set the layer source to the provided source value when restoring outside of the mask", () => {
            const getMaskContextSpy = vi.spyOn( layer.mask, "getContext" );

            restorePaintFromHistory( layer, MOCK_SOURCE, false );

            expect( getMaskContextSpy ).not.toHaveBeenCalled();

            expect( layer.source.getContext( "2d" ).drawImage ).toHaveBeenCalledWith( expect.any( global.Image ), 0, 0 );
        });

        it( "should set the layer mask to the provided source value when restoring inside of the mask", () => {
            const getSourceContextSpy = vi.spyOn( layer.source, "getContext" );
            
            restorePaintFromHistory( layer, MOCK_SOURCE, true );

            expect( getSourceContextSpy ).not.toHaveBeenCalled();
            
            expect( layer.mask.getContext( "2d" ).drawImage ).toHaveBeenCalledWith( expect.any( global.Image ), 0, 0 );
        });

        it( "should request a filter invalidation and recache from the Layers renderer ", () => {
            const recacheSpy = vi.spyOn( layerRenderer, "resetFilterAndRecache" );

            restorePaintFromHistory( layer, MOCK_SOURCE, false );

            expect( recacheSpy ).toHaveBeenCalledWith();
        });
    });
});