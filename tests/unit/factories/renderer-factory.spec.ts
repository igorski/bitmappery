import { it, describe, expect, beforeEach, vi } from "vitest";
import { mockZCanvas, createMockZoomableCanvas } from "../mocks";
import LayerFactory from "@/factories/layer-factory";
import type ZoomableCanvas from "@/rendering/actors/zoomable-canvas";
import LayerRenderer from "@/rendering/actors/layer-renderer";

mockZCanvas();

import {
    getCanvasInstance, setCanvasInstance,
    createRendererForLayer, hasRendererForLayer, getRendererForLayer, flushLayerRenderers,
    flushCache
} from "@/factories/renderer-factory";

describe( "Renderer factory", () => {
    describe( "when maintaining the active zCanvas instance", () => {
        it( "should not have an instance by default", () => {
            expect( getCanvasInstance() ).toBeNull();
        });

        it( "should be able to set and retrieve the active zCanvas instance", () => {
            const zCanvas = createMockZoomableCanvas();
            setCanvasInstance( zCanvas );
            expect( getCanvasInstance() ).toEqual( zCanvas );
        });

        it( "should be able to unset the active zCanvas instance", () => {
            expect( getCanvasInstance() ).not.toBeNull(); // set in previous test
            setCanvasInstance( null );
            expect( getCanvasInstance() ).toBeNull();
        });
    });

    describe( "when lazily creating / caching renderers", () => {
        let zCanvas: ZoomableCanvas;
        let layer1renderer: LayerRenderer;

        const layer1 = LayerFactory.create({ id: "layer1", width: 10, height: 10 });
        const layer2 = LayerFactory.create({ id: "layer2", width: 10, height: 10 });

        beforeEach(() => {
            zCanvas = createMockZoomableCanvas();
        });

        it( "should create a new renderer on first request", () => {
            layer1renderer = createRendererForLayer( zCanvas, layer1 );
            expect( layer1renderer instanceof LayerRenderer );
            expect( zCanvas.addChild ).toHaveBeenCalledWith( layer1renderer );
        });

        it( "should know when there is a renderer cached for a layer", () => {
            expect( hasRendererForLayer( layer1 )).toBe( true );
            expect( hasRendererForLayer( layer2 )).toBe( false );
        });

        it( "should retrieve the cached renderer on repeated invocation for the same layer", () => {
            const newRenderer = createRendererForLayer( zCanvas, layer1 );
            expect( newRenderer ).toEqual( layer1renderer );
            expect( zCanvas.addChild ).not.toHaveBeenCalledWith( layer1renderer );
        });

        it( "should be able to retrieve the cached renderer for a layer", () => {
            expect( getRendererForLayer( layer1 )).toEqual( layer1renderer );
            expect( getRendererForLayer( layer2 )).toBeNull(); // no renderer registered
        });

        it( "should be able to dispose all renderers for a layer", () => {
            vi.spyOn( layer1renderer, "dispose" );
            flushLayerRenderers( layer1 );
            expect( getRendererForLayer( layer1 )).toBeNull();
            expect( layer1renderer.dispose ).toHaveBeenCalled();
        });
    });

    it( "should be able to flush its cache in its entierity", () => {
        const zCanvas = createMockZoomableCanvas();
        const layer1  = LayerFactory.create({ id: "layer1", width: 10, height: 10 });
        const layer2  = LayerFactory.create({ id: "layer2", width: 10, height: 10 });

        const layer1renderer = createRendererForLayer( zCanvas, layer1 );
        const layer2renderer = createRendererForLayer( zCanvas, layer2 );

        vi.spyOn( layer1renderer, "dispose" );
        vi.spyOn( layer2renderer, "dispose" );

        flushCache();

        expect( hasRendererForLayer( layer1 )).toBe( false );
        expect( hasRendererForLayer( layer2 )).toBe( false );

        expect( layer1renderer.dispose ).toHaveBeenCalled();
        expect( layer2renderer.dispose ).toHaveBeenCalled();
    });
});
