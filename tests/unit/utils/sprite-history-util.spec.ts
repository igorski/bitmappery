import { it, afterEach, beforeEach, describe, expect, vi } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../mocks";

mockZCanvas();

import LayerFactory from "@/factories/layer-factory";
import LayerSprite from "@/rendering/canvas-elements/layer-sprite";
import { positionSpriteFromHistory, restorePaintFromHistory } from "@/utils/sprite-history-util";

const mockGetSpriteForLayer = vi.fn();
vi.mock( "@/factories/sprite-factory", () => ({
    getSpriteForLayer: vi.fn(( ...args ) => mockGetSpriteForLayer( ...args )),
}));

const mockFlushBlendedLayerCache = vi.fn();
let mockUseBlendCaching = false;
vi.mock( "@/rendering/cache/blended-layer-cache", () => ({
    flushBlendedLayerCache: vi.fn(() => mockFlushBlendedLayerCache()),
    useBlendCaching: vi.fn(() => mockUseBlendCaching ),
}));

describe( "Sprite history utilities", () => {
    const layer = LayerFactory.create({
        source: createMockCanvasElement(),
        mask: createMockCanvasElement(),
    });
    let layerSprite: LayerSprite;

    beforeEach(() => {
        layerSprite = new LayerSprite( layer );
        mockGetSpriteForLayer.mockReturnValue( layerSprite );
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "When adjusting a Sprite's position from a history state", () => {
        it( "should update the existing bounds object directly without invoking the setter methods", () => {
            const orgBounds = layerSprite.getBounds();
            const { width, height } = orgBounds;
       
            positionSpriteFromHistory( layer, 5, 7 );

            expect( orgBounds ).toEqual({
                left: 5,
                top: 7,
                width,
                height,
            });
        });

        it( "should call the invalidate() method on the Sprite to trigger a render", () => {
            const invalidateSpy = vi.spyOn( layerSprite, "invalidate" );
       
            positionSpriteFromHistory( layer, 5, 7 );

            expect( invalidateSpy ).toHaveBeenCalled();
        });

        it( "should not invalidate the blended layer cache when blend caching is disabled", () => {
            mockUseBlendCaching = false;

            positionSpriteFromHistory( layer, 5, 7 );
            
            expect( mockFlushBlendedLayerCache ).not.toHaveBeenCalled();
        });

        it( "should invalidate the blended layer cache when blend caching is enabled", () => {
            mockUseBlendCaching = true;

            positionSpriteFromHistory( layer, 5, 7 );
            
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

        it( "should request a filter invalidation and recache from the Layer Sprite ", () => {
            const recacheSpy = vi.spyOn( layerSprite, "resetFilterAndRecache" );

            restorePaintFromHistory( layer, MOCK_SOURCE, false );

            expect( recacheSpy ).toHaveBeenCalledWith();
        });
    });
});