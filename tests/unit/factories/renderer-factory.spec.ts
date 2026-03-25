import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockZCanvas, createMockZoomableCanvas } from "../mocks";
import LayerFactory from "@/factories/layer-factory";
import type ZoomableCanvas from "@/rendering/actors/zoomable-canvas";
import LayerRenderer from "@/rendering/actors/layer-renderer";

mockZCanvas();

import {
    createRendererForLayer, hasRendererForLayer, getRendererForLayer, flushLayerRenderers, flushRendererCache
} from "@/factories/renderer-factory";

describe( "Renderer factory", () => {
    const layer1 = LayerFactory.create({ id: "layer1", width: 10, height: 10 });
    const layer2 = LayerFactory.create({ id: "layer2", width: 10, height: 10 });

    describe( "when lazily creating / caching renderers", () => {
        let zCanvas: ZoomableCanvas;
        let layer1renderer: LayerRenderer;

        beforeEach(() => {
            zCanvas = createMockZoomableCanvas();
        });

        afterEach(() => {
            flushRendererCache();
            vi.resetAllMocks();
        });

        it( "should create a new renderer on first request and add it to the canvas", () => {
            layer1renderer = createRendererForLayer( zCanvas, layer1 );

            expect( layer1renderer instanceof LayerRenderer );
            expect( zCanvas.addChild ).toHaveBeenCalledWith( layer1renderer );
        });

        it( "should by default create a new renderer that immediately caches it contents", () => {
            const layerRendererCacheSpy = vi.spyOn( LayerRenderer.prototype, "cacheEffects" );

            layer1renderer = createRendererForLayer( zCanvas, layer1, false );

            expect( layerRendererCacheSpy ).toHaveBeenCalled();
        });

        it( "should not create a new renderer with instant caching when requested", () => {
            const layerRendererCacheSpy = vi.spyOn( LayerRenderer.prototype, "cacheEffects" );

            layer1renderer = createRendererForLayer( zCanvas, layer1, false, false );

            expect( layerRendererCacheSpy ).not.toHaveBeenCalled();
        });

        it( "should know when there is a renderer cached for a layer", () => {
            expect( hasRendererForLayer( layer1 )).toBe( false );

            layer1renderer = createRendererForLayer( zCanvas, layer1 );

            expect( hasRendererForLayer( layer1 )).toBe( true );
        });

        it( "should retrieve the cached renderer on repeated invocation for the same layer", () => {
            layer1renderer = createRendererForLayer( zCanvas, layer1 );

            const newRenderer = createRendererForLayer( zCanvas, layer1 );
            vi.resetAllMocks();
            
            expect( newRenderer ).toEqual( layer1renderer );
            expect( zCanvas.addChild ).not.toHaveBeenCalledWith( layer1renderer );
        });

        it( "should be able to retrieve the cached renderer for a layer", () => {
            expect( getRendererForLayer( layer1 )).toBeNull(); // no renderer registered

            layer1renderer = createRendererForLayer( zCanvas, layer1 );

            expect( getRendererForLayer( layer1 )).toEqual( layer1renderer );
        });

        it( "should be able to dispose all renderers for a layer", () => {
            layer1renderer = createRendererForLayer( zCanvas, layer1 );
            vi.spyOn( layer1renderer, "dispose" );

            flushLayerRenderers( layer1 );
            
            expect( getRendererForLayer( layer1 )).toBeNull();
            expect( layer1renderer.dispose ).toHaveBeenCalled();
        });
    });

    it( "should be able to flush its cache in its entierity", () => {
        const zCanvas = createMockZoomableCanvas();

        const layer1renderer = createRendererForLayer( zCanvas, layer1 );
        const layer2renderer = createRendererForLayer( zCanvas, layer2 );

        vi.spyOn( layer1renderer, "dispose" );
        vi.spyOn( layer2renderer, "dispose" );

        flushRendererCache();

        expect( hasRendererForLayer( layer1 )).toBe( false );
        expect( hasRendererForLayer( layer2 )).toBe( false );

        expect( layer1renderer.dispose ).toHaveBeenCalled();
        expect( layer2renderer.dispose ).toHaveBeenCalled();
    });
});
