import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockZoomableCanvas } from "../../mocks";
import LayerFactory from "@/model/factories/layer-factory";
import { createRendererForLayer, flushLayerRenderers } from "@/model/factories/renderer-factory";
import { onLayerPropertiesChange, type IChangeSource } from "@/model/actions/layer-properties-change";
import type LayerRenderer from "@/rendering/actors/layer-renderer";

let mockAffectsBlendCache = false;
const mockFlushBlendedLayerCache = vi.fn();
vi.mock( "@/rendering/cache/blended-layer-cache", async ( importOriginal ) => {
    return {
        ...await importOriginal(),
        affectsBlendCache: vi.fn(() => mockAffectsBlendCache ),
        flushBlendedLayerCache: vi.fn(( ...args: any[] ) => mockFlushBlendedLayerCache( ...args )),
    };
});

const mockUpdateWorker = vi.fn();
vi.mock( "@/services/render-service", async ( importOriginal ) => {
    return {
        ...await importOriginal(),
        updateWorker: vi.fn(( ...args: any[] ) => mockUpdateWorker( ...args )),
    };
});

describe( "on Layer properties change", () => {
    const layer = LayerFactory.create();
    let layerRenderer: LayerRenderer;

    beforeEach(() => {
        layerRenderer = createRendererForLayer( createMockZoomableCanvas(), layer, false, false );
    });

    afterEach(() => {
        vi.resetAllMocks();
        flushLayerRenderers( layer );
        mockAffectsBlendCache = false;
    });

    it( "should update the Layer reference in the associated LayerRender", () => {
        const layer2 = {
            ...layer,
            name: "This is now renamed",
        };
        onLayerPropertiesChange( layer2, { sources: [ "name" ] });

        expect( layerRenderer.layer ).toEqual( layer2 );
    });

    describe( "when determining whether to flush the blended layer cache", () => {
        const supportedSources: IChangeSource[] = [ "filters", "visible" ];
        const unsupportedSources = Object.keys( layer )
            .filter( key => !supportedSources.includes( key as IChangeSource )) as IChangeSource[];

        it.each( unsupportedSources )
            ( `should not flush the blended layer cache for an unsupported "%s" change source, even when the layer affects the blend cache`, source => {
            mockAffectsBlendCache = true;

            onLayerPropertiesChange( layer, { index: 0, sources: [ source ] });
 
            expect( mockFlushBlendedLayerCache ).not.toHaveBeenCalled();
        });

        it.each( supportedSources )
            ( `should not flush the blended layer cache for supported change source "%s" when the layer does not affect the blend cache`, source  => {
            mockAffectsBlendCache = false;

            onLayerPropertiesChange( layer, { index: 0, sources: [ source ] });

            expect( mockFlushBlendedLayerCache ).not.toHaveBeenCalled();
        });

        it.each( supportedSources )
            ( `should fully flush the blended layer cache for supported change source "%s" when the layer affects the blend cache`, source => {
            mockAffectsBlendCache = true;

            onLayerPropertiesChange( layer, { index: 0, sources: [ source ] });
  
            expect( mockFlushBlendedLayerCache ).toHaveBeenCalledWith( true );
        });

        it.each( supportedSources )
            ( `should throw an Error for a supported change source "%s" when the layer affects the blend cache but no index was provided`, source => {
            mockAffectsBlendCache = true;

            expect(() => {
                onLayerPropertiesChange( layer, { sources: [ source ] });
            }).toThrow();

            expect( mockFlushBlendedLayerCache ).not.toHaveBeenCalled();
        });
    });

    describe( "when determining whether to reset the filter cache", () => {
        const supportedSources: IChangeSource[] = [ "source", "mask", "maskX", "maskY" ];
        const unsupportedSources = Object.keys( layer )
            .filter( key => !supportedSources.includes( key as IChangeSource )) as IChangeSource[];

        it.each( unsupportedSources )
            ( `should not request a sync with any reserved Workers for an unsupported "%s" change source`, source => {
            onLayerPropertiesChange( layer, { index: 0, sources: [ source ] });

            expect( mockUpdateWorker ).not.toHaveBeenCalled();
        });

        it.each( supportedSources )( `should request a sync with any reserved Workers for a supported "%s" change source`, source => {
            onLayerPropertiesChange( layer, { sources: [ source ] });

            expect( mockUpdateWorker ).toHaveBeenCalledWith( layer );
        });

        it.each( unsupportedSources )
            ( `should not request a filter recache for an unsupported "%s" change source`, source => {
            const resetSpy = vi.spyOn( layerRenderer, "resetFilterAndRecache" );

            onLayerPropertiesChange( layer, { index: 0, sources: [ source ] });

            expect( resetSpy ).not.toHaveBeenCalled();
        });

        it.each( supportedSources )( `should request a filter recache for a supported "%s" change source`, source => {
            const resetSpy = vi.spyOn( layerRenderer, "resetFilterAndRecache" );

            onLayerPropertiesChange( layer, { sources: [ source ] });

            expect( resetSpy ).toHaveBeenCalled();
        });

        it.each( unsupportedSources.filter( key => key !== "filters" ))
            ( `should not request an effects cache for a non "filters" change source`, source => {
            const cacheEffectsSpy = vi.spyOn( layerRenderer, "cacheEffects" );

            onLayerPropertiesChange( layer, { index: 0, sources: [ source ] });

            expect( cacheEffectsSpy ).not.toHaveBeenCalled();
        });

        it( `should request an effects cache for a "filters" change source`, () => {
            const cacheEffectsSpy = vi.spyOn( layerRenderer, "cacheEffects" );

            onLayerPropertiesChange( layer, { index: 0, sources: [ "filters" ] });

            expect( cacheEffectsSpy ).toHaveBeenCalled();
        });
    });
});
