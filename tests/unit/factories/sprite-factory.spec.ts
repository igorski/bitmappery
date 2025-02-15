import { it, describe, expect, beforeEach, vi } from "vitest";
import { sprite, mockZCanvas, createMockZoomableCanvas } from "../mocks";
import LayerFactory from "@/factories/layer-factory";
import type ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";
import type LayerSprite from "@/rendering/canvas-elements/layer-sprite";

mockZCanvas();

import {
    getCanvasInstance, setCanvasInstance,
    createSpriteForLayer, hasSpriteForLayer, getSpriteForLayer, flushLayerSprites,
    flushCache
} from "@/factories/sprite-factory";

describe( "Sprite factory", () => {
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

    describe( "when lazily creating / caching sprites", () => {
        let zCanvas: ZoomableCanvas;
        let layer1sprite: LayerSprite;

        const layer1 = LayerFactory.create({ id: "layer1", width: 10, height: 10 });
        const layer2 = LayerFactory.create({ id: "layer2", width: 10, height: 10 });

        beforeEach(() => {
            zCanvas = createMockZoomableCanvas();
        });

        it( "should create a new Sprite on first request", () => {
            layer1sprite = createSpriteForLayer( zCanvas, layer1 );
            expect( layer1sprite instanceof sprite );
            expect( zCanvas.addChild ).toHaveBeenCalledWith( layer1sprite );
        });

        it( "should know when there is a Sprite cached for a layer", () => {
            expect( hasSpriteForLayer( layer1 )).toBe( true );
            expect( hasSpriteForLayer( layer2 )).toBe( false );
        });

        it( "should retrieve the cached Sprite on repeated invocation for the same layer", () => {
            const newSprite = createSpriteForLayer( zCanvas, layer1 );
            expect( newSprite ).toEqual( layer1sprite );
            expect( zCanvas.addChild ).not.toHaveBeenCalledWith( layer1sprite );
        });

        it( "should be able to retrieve the cached Sprite for a layer", () => {
            expect( getSpriteForLayer( layer1 )).toEqual( layer1sprite );
            expect( getSpriteForLayer( layer2 )).toBeNull(); // no Sprite registered
        });

        it( "should be able to dispose all Sprites for a layer", () => {
            vi.spyOn( layer1sprite, "dispose" );
            flushLayerSprites( layer1 );
            expect( getSpriteForLayer( layer1 )).toBeNull();
            expect( layer1sprite.dispose ).toHaveBeenCalled();
        });
    });

    it( "should be able to flush its cache in its entierity", () => {
        const zCanvas = createMockZoomableCanvas();
        const layer1  = LayerFactory.create({ id: "layer1", width: 10, height: 10 });
        const layer2  = LayerFactory.create({ id: "layer2", width: 10, height: 10 });

        const layer1sprite = createSpriteForLayer( zCanvas, layer1 );
        const layer2sprite = createSpriteForLayer( zCanvas, layer2 );

        vi.spyOn( layer1sprite, "dispose" );
        vi.spyOn( layer2sprite, "dispose" );

        flushCache();

        expect( hasSpriteForLayer( layer1 )).toBe( false );
        expect( hasSpriteForLayer( layer2 )).toBe( false );

        expect( layer1sprite.dispose ).toHaveBeenCalled();
        expect( layer2sprite.dispose ).toHaveBeenCalled();
    });
});
