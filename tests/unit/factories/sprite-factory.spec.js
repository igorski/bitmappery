import { sprite } from "zcanvas";
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
            const zCanvas = { name: "zcanvas" };
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
        let zCanvas, layer1sprite;
        const layer1 = { id: "layer1", x: 0, y: 0, width: 10, height: 10 };
        const layer2 = { id: "layer2", x: 0, y: 0, width: 10, height: 10 };

        beforeEach(() => {
            zCanvas = { name: "zcanvas", addChild: jest.fn() };
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
            jest.spyOn( layer1sprite, "dispose" );
            flushLayerSprites( layer1 );
            expect( getSpriteForLayer( layer1 )).toBeNull();
            expect( layer1sprite.dispose ).toHaveBeenCalled();
        });
    });

    it( "should be able to flush its cache in its entierity", () => {
        const zCanvas = { name: "zcanvas", addChild: jest.fn() };
        const layer1  = { id: "layer1", x: 0, y: 0, width: 10, height: 10 };
        const layer2  = { id: "layer2", x: 0, y: 0, width: 10, height: 10 };

        const layer1sprite = createSpriteForLayer( zCanvas, layer1 );
        const layer2sprite = createSpriteForLayer( zCanvas, layer2 );

        jest.spyOn( layer1sprite, "dispose" );
        jest.spyOn( layer2sprite, "dispose" );

        flushCache();

        expect( hasSpriteForLayer( layer1 )).toBe( false );
        expect( hasSpriteForLayer( layer2 )).toBe( false );

        expect( layer1sprite.dispose ).toHaveBeenCalled();
        expect( layer2sprite.dispose ).toHaveBeenCalled();
    });
});
