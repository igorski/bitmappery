import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockCanvasElement, createMockZoomableCanvas, mockZCanvas } from "../../mocks";
mockZCanvas();

import { type Store } from "vuex";
import { type Layer } from "@/definitions/document";
import { LayerTypes } from "@/definitions/layer-types";
import ToolTypes from "@/definitions/tool-types";
import DocumentFactory from "@/factories/document-factory";
import EffectsFactory from "@/factories/effects-factory";
import LayerFactory from "@/factories/layer-factory";
import { degreesToRadians } from "@/math/unit-math";
import { type BitMapperyState } from "@/store";
import LayerSprite from "@/rendering/canvas-elements/layer-sprite";
import type ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";

let mockIsBlendCached = false;
const mockPauseBlendCaching = vi.fn();
vi.mock( "@/rendering/cache/blended-layer-cache", () => ({
    isBlendCached: vi.fn(() => mockIsBlendCached ),
    pauseBlendCaching: vi.fn(( ...args ) => mockPauseBlendCaching( ...args )),
}));

describe( "LayerSprite", () => {
    const activeDocument = DocumentFactory.create();
    const layerIndex = 2;
    let canvas: ZoomableCanvas;
    let sprite: LayerSprite;
    let layer: Layer;
    let mockStore: Store<BitMapperyState>;

    function createLayerSprite( layer: Layer, optLayerIndex?: number ): LayerSprite {
        const newSprite = new LayerSprite( layer );
        newSprite.layerIndex = optLayerIndex ?? layerIndex;
        newSprite.canvas = canvas;
        
        return newSprite;
    }

    beforeEach(() => {
        layer = LayerFactory.create();

        canvas = createMockZoomableCanvas();
        sprite = createLayerSprite( layer );
        
        mockStore = sprite.canvas.store;
        // @ts-expect-error getters is readonly
        mockStore.getters = {
            activeColor: "#FF0000",
            activeLayerMask: null,
        };
    });

    afterEach(() => {
        vi.resetAllMocks();
        mockIsBlendCached = false;
    });

    it( "should hold a reference to the layer it constructs with", () => {
        expect( sprite.layer ).toEqual( layer );
    });

    it( "should be able to sync its position to the Layer coordinates", () => {
        const setXspy = vi.spyOn( sprite, "setX" );
        const setYspy = vi.spyOn( sprite, "setY" );

        layer.left = 50;
        layer.top  = 100;

        sprite.syncPosition();

        expect( setXspy ).toHaveBeenCalledWith( 50 );
        expect( setYspy ).toHaveBeenCalledWith( 100 );
    });

    it( "should know it is maskable when it has a mask and it is currently active in the store", () => {
        expect( sprite.isMaskable() ).toBe( false );
        
        layer.mask = createMockCanvasElement();

        expect( sprite.isMaskable() ).toBe( false );

        mockStore.getters.activeLayerMask = layer.mask;

        expect( sprite.isMaskable() ).toBe( true );
    });

    it( "should consider itself drawable when its of the GRAPHIC type or has a mask", () => {
        const graphicSprite = createLayerSprite( LayerFactory.create({ type: LayerTypes.LAYER_GRAPHIC } ));
        const imageSprite   = createLayerSprite( LayerFactory.create({ type: LayerTypes.LAYER_IMAGE, mask: createMockCanvasElement() } ));
        const textSprite    = createLayerSprite( LayerFactory.create({ type: LayerTypes.LAYER_TEXT,  mask: createMockCanvasElement() } ));

        expect( graphicSprite.isDrawable() ).toBe( true );
        expect( imageSprite.isDrawable() ).toBe( false );
        expect( textSprite.isDrawable() ).toBe( false );
        
        mockStore.getters.activeLayerMask = imageSprite.layer.mask;

        expect( imageSprite.isDrawable() ).toBe( true );

        mockStore.getters.activeLayerMask = textSprite.layer.mask;
        
        expect( textSprite.isDrawable() ).toBe( true );
    });

    it( "should know when the Layer is currently in drawing mode", () => {
        sprite.setInteractive( true );
        expect( sprite.isDrawing() ).toBe( false );

        sprite.handleActiveTool( ToolTypes.BRUSH, undefined, activeDocument );

        expect( sprite.isDrawing() ).toBe( false );

        sprite.handlePress( 0, 0, new MouseEvent( "mousedown" ));

        expect( sprite.isDrawing() ).toBe( true );
    });

    describe( "when determining the Layers transformations", () => {
        it( "should know when it is rotated", () => {
            expect( sprite.isRotated() ).toBe( false );

            const rotatedSprite = createLayerSprite( LayerFactory.create({
                effects: EffectsFactory.create({ rotation: 90 })
            }));

            expect( rotatedSprite.isRotated() ).toBe( true );
        });

        it( "should know when it is scaled", () => {
            expect( sprite.isScaled() ).toBe( false );

            const rotatedSprite = createLayerSprite( LayerFactory.create({
                effects: EffectsFactory.create({ scale: 0.9 })
            }));

            expect( rotatedSprite.isScaled() ).toBe( true );
        });
    });

    it( "should mark itself as interactive when its corresponding layer is the active one", () => {
        expect( sprite.getInteractive() ).toBe( false );

        sprite.handleActiveLayer( sprite.layer );

        expect( sprite.getInteractive() ).toBe( true );
    });

    describe( "when retrieving the sprite's actual bounds", () => {
        it( "should return the bounds unchanged when there are no transformations", () => {
            sprite.setBounds( 1, 2, 10, 5 );

            expect( sprite.getActualBounds() ).toEqual({
                left: 1,
                top: 2,
                width: 10,
                height: 5,
            });
        });

        it( "should return the bounds transformed when there is a scale transformation", () => {
            sprite = createLayerSprite(
                LayerFactory.create({
                    effects: EffectsFactory.create({ scale: 2 })
                })
            );

            sprite.setBounds( 1, 2, 10, 5 );

            expect( sprite.getActualBounds() ).toEqual({
                left: -4,
                top: -0.5,
                width: 20,
                height: 10,
            });
        });

        it( "should return the bounds transformed when there is a rotation transformation", () => {
            sprite = createLayerSprite(
                LayerFactory.create({
                    effects: EffectsFactory.create({ rotation: degreesToRadians( 90 ) })
                })
            );

            sprite.setBounds( 1, 2, 10, 5 );

            const { left, top, width, height } = sprite.getActualBounds();

            expect( left ).toBeCloseTo( 3.5 );
            expect( top ).toBeCloseTo( -0.5 );
            expect( width ).toBeCloseTo( 5 );
            expect( height ).toBeCloseTo( 10 );
        });

        it( "should return the bounds transformed when there is both a scale and rotation transformation", () => {
            sprite = createLayerSprite(
                LayerFactory.create({
                    effects: EffectsFactory.create({ scale: 0.5, rotation: degreesToRadians( 90 ) })
                })
            );

            sprite.setBounds( 1, 2, 10, 5 );

            const { left, top, width, height } = sprite.getActualBounds();

            expect( left ).toBeCloseTo( 4.75 );
            expect( top ).toBeCloseTo( 2 );
            expect( width ).toBeCloseTo( 2.5 );
            expect( height ).toBeCloseTo( 5 );
        });
    });

    describe( "when handling pointer press events", () => {
        it( "should request to pause the blended layer cache on press", () => {
            sprite.handlePress( 0, 0, new MouseEvent( "mousedown" ));

            expect( mockPauseBlendCaching ).toHaveBeenCalledWith( layerIndex, true );
        });

        it( "should request to unpause the blended layer cache on release", () => {
            sprite.handleRelease( 0, 0 );

            expect( mockPauseBlendCaching ).toHaveBeenCalledWith( layerIndex, false );
        });
    });

    describe( "when handling the paint state", () => {
        it( "should return the source layer when the Layer has no mask", () => {
            expect( sprite.getPaintSource() ).toEqual( layer.source );
        });

        it( "should return the mask layer when the Layer has an active mask", () => {
            layer.mask = createMockCanvasElement();
            mockStore.getters.activeLayerMask = layer.mask;

            expect( sprite.getPaintSource() ).toEqual( layer.mask );
        });
    });
});