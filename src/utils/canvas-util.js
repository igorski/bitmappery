import { sprite } from "zcanvas";

/**
 * Sprites are used to represend graphics. These are mapped
 * to the graphic ids (see graphic-factory.js)
 */
const spriteCache = new Map();

/**
 * Creates a new HTMLCanvasElement, returning both
 * the element and its CanvasRenderingContext2D
 */
export const createCanvas = () => {
    const cvs = document.createElement( "canvas" );
    const ctx = cvs.getContext( "2d" );
    return { cvs, ctx };
};

/**
 * If a layer were to be removed / set to invisible, we
 * flush all its cached Sprites.
 */
export const flushSpritesInLayer = layer => {
    console.warn("flushing sprites in layer");
    layer.graphics.forEach(({ id }) => {
        if ( spriteCache.has( id )) {
            disposeSprite( spriteCache.get( id ));
            spriteCache.delete( id );
        }
    });
}

/**
 * Clears the entire cache and disposes all Sprites.
 */
export const flushCache = () => {
    console.warn("flushing cache");
    spriteCache.forEach( disposeSprite );
    spriteCache.clear();
}

/**
 * Lazily retrieve / create a cached sprite to represent given
 * graphic on given zCanvas instance
 */
export const createSpriteForGraphic = ( zCanvasInstance, { id, bitmap, x, y, width, height }) => {
    let output;
    if ( spriteCache.has( id )) {
        output = spriteCache.get( id );
    }
    // laily create sprite
    if ( !output ) {
        output = new sprite({
            bitmap, x, y, width, height
        });
        output.setDraggable( true );
        zCanvasInstance.addChild( output );
        spriteCache.set( id, output );
    }
    return output;
}

/* internal methods */

function disposeSprite( sprite ) {
    sprite?.dispose();
    // TODO: also free associated bitmap ?
}
