import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockCanvasElement, createMockZoomableCanvas, mockCanvasConstructor, mockZCanvas } from "../../mocks";
mockZCanvas();

import { type Store } from "vuex";
import { BlendModes } from "@/definitions/blend-modes";
import { type Layer } from "@/definitions/document";
import ToolTypes from "@/definitions/tool-types";
import DocumentFactory from "@/factories/document-factory";
import EffectsFactory from "@/factories/effects-factory";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import { degreesToRadians } from "@/math/unit-math";
import { type BitMapperyState } from "@/store";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import type ZoomableCanvas from "@/rendering/actors/zoomable-canvas";

let mockIsBlendCached = false;
const mockPauseBlendCaching = vi.fn();
const mockFlushBlendedLayerCache = vi.fn();
vi.mock( "@/rendering/cache/blended-layer-cache", () => ({
    isBlendCached: vi.fn(() => mockIsBlendCached ),
    pauseBlendCaching: vi.fn(( ...args ) => mockPauseBlendCaching( ...args )),
    flushBlendedLayerCache: vi.fn(() => mockFlushBlendedLayerCache() ),
}));

const mockRenderEffectsForLayer = vi.fn();
vi.mock( "@/services/render-service", () => ({
    renderEffectsForLayer: vi.fn(( ...args ) => mockRenderEffectsForLayer( ...args )),
}));

describe( "LayerRenderer", () => {
    const activeDocument = DocumentFactory.create();
    const layerIndex = 2;
    let canvas: ZoomableCanvas;
    let renderer: LayerRenderer;
    let layer: Layer;
    let mockStore: Store<BitMapperyState>;

    function createLayerRenderer( layer: Layer, optLayerIndex?: number ): LayerRenderer {
        const newRenderer = new LayerRenderer( layer );
        newRenderer.layerIndex = optLayerIndex ?? layerIndex;
        newRenderer.canvas = canvas;
        
        return newRenderer;
    }

    beforeEach(() => {
        vi.useFakeTimers();
        mockCanvasConstructor();

        layer = LayerFactory.create();

        canvas = createMockZoomableCanvas();
        renderer = createLayerRenderer( layer );
        
        mockStore = renderer.canvas.store;
        // @ts-expect-error getters is readonly
        mockStore.getters = {
            activeColor: "#FF0000",
            activeLayerMask: null,
        };
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.useRealTimers();
        mockIsBlendCached = false;
    });

    it( "should hold a reference to the layer it constructs with", () => {
        expect( renderer.layer ).toEqual( layer );
    });

    it( "should be able to sync its position to the Layer coordinates", () => {
        const setXspy = vi.spyOn( renderer, "setX" );
        const setYspy = vi.spyOn( renderer, "setY" );

        layer.left = 50;
        layer.top  = 100;

        renderer.syncPosition();

        expect( setXspy ).toHaveBeenCalledWith( 50 );
        expect( setYspy ).toHaveBeenCalledWith( 100 );
    });

    it( "should know when the Layer is currently in drawing mode", () => {
        renderer.setInteractive( true );
        expect( renderer.isDrawing() ).toBe( false );

        renderer.handleActiveTool( ToolTypes.BRUSH, undefined, activeDocument );

        expect( renderer.isDrawing() ).toBe( false );

        renderer.handlePress( 0, 0, new MouseEvent( "mousedown" ));

        expect( renderer.isDrawing() ).toBe( true );
    });

    it( "should mark itself as interactive when its corresponding layer is the active one", () => {
        expect( renderer.getInteractive() ).toBe( false );

        renderer.handleActiveLayer( renderer.layer );

        expect( renderer.getInteractive() ).toBe( true );
    });

    describe( "when retrieving the renderers actual bounds", () => {
        it( "should return the bounds unchanged when there are no transformations", () => {
            renderer.setBounds( 1, 2, 10, 5 );

            expect( renderer.getActualBounds() ).toEqual({
                left: 1,
                top: 2,
                width: 10,
                height: 5,
            });
        });

        it( "should return the bounds transformed when there is a scale transformation", () => {
            renderer = createLayerRenderer(
                LayerFactory.create({
                    effects: EffectsFactory.create({ scale: 2 })
                })
            );

            renderer.setBounds( 1, 2, 10, 5 );

            expect( renderer.getActualBounds() ).toEqual({
                left: -4,
                top: -0.5,
                width: 20,
                height: 10,
            });
        });

        it( "should return the bounds transformed when there is a rotation transformation", () => {
            renderer = createLayerRenderer(
                LayerFactory.create({
                    effects: EffectsFactory.create({ rotation: degreesToRadians( 90 ) })
                })
            );

            renderer.setBounds( 1, 2, 10, 5 );

            const { left, top, width, height } = renderer.getActualBounds();

            expect( left ).toBeCloseTo( 3.5 );
            expect( top ).toBeCloseTo( -0.5 );
            expect( width ).toBeCloseTo( 5 );
            expect( height ).toBeCloseTo( 10 );
        });

        it( "should return the bounds transformed when there is both a scale and rotation transformation", () => {
            renderer = createLayerRenderer(
                LayerFactory.create({
                    effects: EffectsFactory.create({ scale: 0.5, rotation: degreesToRadians( 90 ) })
                })
            );

            renderer.setBounds( 1, 2, 10, 5 );

            const { left, top, width, height } = renderer.getActualBounds();

            expect( left ).toBeCloseTo( 4.75 );
            expect( top ).toBeCloseTo( 2 );
            expect( width ).toBeCloseTo( 2.5 );
            expect( height ).toBeCloseTo( 5 );
        });
    });

    describe( "when handling pointer press events", () => {
        it( "should request to pause the blended layer cache on press", () => {
            renderer.handlePress( 0, 0, new MouseEvent( "mousedown" ));

            expect( mockPauseBlendCaching ).toHaveBeenCalledWith( layerIndex, true );
        });

        it( "should request to unpause the blended layer cache on release", () => {
            renderer.handleRelease( 0, 0 );

            expect( mockPauseBlendCaching ).toHaveBeenCalledWith( layerIndex, false );
        });

        it( `should immediately invoke the paint function when pressing down with the "${ToolTypes.FILL}"-tool active`, () => {
            const paintSpy = vi.spyOn( renderer, "paint" );

            renderer.handleActiveLayer( renderer.layer ); // make interactive
            renderer.handleActiveTool( ToolTypes.FILL, {}, activeDocument ); // set tool
            renderer.handlePress( 0, 0, new MouseEvent( "mousedown" ));

            expect( paintSpy ).toHaveBeenCalled();
        });
    });

    describe( "when handling the paint state", () => {
        it( "should return the source layer when the Layer has no mask", () => {
            expect( renderer.getPaintSource() ).toEqual( layer.source );
        });

        it( "should return the mask layer when the Layer has an active mask", () => {
            layer.mask = createMockCanvasElement();
            mockStore.getters.activeLayerMask = layer.mask;

            expect( renderer.getPaintSource() ).toEqual( layer.mask );
        });
    });

    describe( "when caching the Layers effects into a prerendered source image", () => {
        async function mockAsyncRender(): Promise<void> {
            vi.runAllTimers();
            await mockRenderEffectsForLayer.mockResolvedValue( true );
        }

        beforeEach( async () => {
            // completes first automatic cache invocation in LayerRenderer constructor
            await mockAsyncRender();
            // @ts-expect-error setLock is not typed as a vi Spy function
            canvas.setLock.mockClear();
            mockRenderEffectsForLayer.mockClear();
        });
        
        it( "should call the render directly on construction", () => {
            const cacheSpy = vi.spyOn( LayerRenderer.prototype, "cacheEffects" );

            new LayerRenderer( layer );
            
            expect( cacheSpy ).toHaveBeenCalled();
        });

        it( "should lock the canvas rendering state, freezing the current image while the effects cache is being rendered", () => {
            renderer.cacheEffects();

            expect( canvas.setLock ).toHaveBeenCalledWith( true );
        });

        it( "should request a render of the effects for the renderers related Layer", async () => {
            renderer.cacheEffects();
            
            await mockAsyncRender();

            expect( mockRenderEffectsForLayer ).toHaveBeenCalledWith( renderer.layer );
        });

        it( "should defer the render request until the next animation frame", async () => {
            renderer.cacheEffects();

            expect( mockRenderEffectsForLayer ).not.toHaveBeenCalled();

            vi.runAllTimers(); // runs RAF

            expect( mockRenderEffectsForLayer ).toHaveBeenCalled();
        });

        it( "should unlock the canvas rendering state when rendering has completed", async () => {
            renderer.cacheEffects();

            await mockAsyncRender();

            expect( canvas.setLock ).toHaveBeenCalledWith( false );
        });

        it( "should not execute subsequent calls when a render is still pending", () => {
            renderer.cacheEffects();
            renderer.cacheEffects();

            expect( canvas.setLock ).toHaveBeenCalledTimes( 1 );
        });

        it( "should allow requesting a new render after the previous one has finished", async () => {
            renderer.cacheEffects(); // 1st call : setLock( true )

            await mockAsyncRender(); // 2nd call : setLock( false )

            renderer.cacheEffects(); // 3rd call: setLock( true )

            expect( canvas.setLock ).toHaveBeenCalledTimes( 3 );
        });

        it( "should request a full invalidation of the the blend cache upon render completion", async () => {
            const layerRenderer = new LayerRenderer( LayerFactory.create({
                filters: FiltersFactory.create({ blendMode: BlendModes.DARKEN })
            }));
            const invalidateSpy = vi.spyOn( layerRenderer, "invalidateBlendCache" );

            await mockAsyncRender();

            expect( invalidateSpy ).toHaveBeenCalledWith( true );
        });
    });

    describe( "when invalidating the blend cache", () => {
        it( "should not flush the blended layer cache when the layer does not have a blend filter", () => {
            const layerRenderer = new LayerRenderer( LayerFactory.create({
                filters: FiltersFactory.create({ blendMode: BlendModes.NORMAL })
            }));

            layerRenderer.invalidateBlendCache();

            expect( mockFlushBlendedLayerCache ).not.toHaveBeenCalled();
        });

        it( "should flush the blended layer cache when the layer has a blend filter", () => {
            const layerRenderer = new LayerRenderer( LayerFactory.create({
                filters: FiltersFactory.create({ blendMode: BlendModes.DARKEN })
            }));

            layerRenderer.invalidateBlendCache();

            expect( mockFlushBlendedLayerCache ).toHaveBeenCalled();
        });

        it( "should flush the blended layer cache when the layer does not have a blend filter, but is part of the blended layer cache", () => {
            mockIsBlendCached = true;

            const layerRenderer = new LayerRenderer( LayerFactory.create({
                filters: FiltersFactory.create({ blendMode: BlendModes.NORMAL })
            }));

            layerRenderer.invalidateBlendCache();

            expect( mockFlushBlendedLayerCache ).toHaveBeenCalled();
        });
    });
});