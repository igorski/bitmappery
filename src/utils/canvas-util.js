/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { canvas, loader } from "zcanvas";
import { JPEG, PNG }      from "@/definitions/image-types";
import { LAYER_GRAPHIC, LAYER_IMAGE, LAYER_MASK } from "@/definitions/layer-types";
import { getSpriteForLayer }        from "@/factories/sprite-factory";
import { getRectangleForSelection } from "@/utils/image-math";

/**
 * Creates a new HTMLCanvasElement, returning both
 * the element and its CanvasRenderingContext2D
 */
export const createCanvas = ( optWidth = 0, optHeight = 0 ) => {
    const cvs = document.createElement( "canvas" );
    const ctx = cvs.getContext( "2d" );

    if ( optWidth !== 0 && optHeight !== 0 ) {
        cvs.width  = optWidth;
        cvs.height = optHeight;
    }
    return { cvs, ctx };
};

export const imageToBase64 = ( bitmap, width, height ) => {
    let cvs;
    if ( bitmap instanceof Image ) {
        ({ cvs } = createCanvas( width, height ));
        cvs.getContext( "2d" ).drawImage( bitmap, 0, 0 );
        return cvs.toDataURL( JPEG ); // assume photographic content TODO: check transparency
    } else if ( bitmap instanceof HTMLCanvasElement ) {
        cvs = bitmap;
        return cvs.toDataURL( PNG ); // assume transparent content
    }
    return "";
};

export const base64ToLayerImage = async( base64, type, width, height ) => {
    if ( !base64 ) {
        return null;
    }
    const { image, size } = await loader.loadImage( base64 );
    switch ( type ) {
        default:
        case LAYER_GRAPHIC:
        case LAYER_MASK:
            const { cvs, ctx } = createCanvas( width, height );
            ctx.drawImage( image, 0, 0 );
            return cvs;

        case LAYER_IMAGE:
            // TODO: make Blob
            return image;
    }
    return null;
};

export const resizeImage = async ( image, srcWidth, srcHeight, targetWidth, targetHeight ) => {
    if ( srcWidth === targetWidth && srcHeight === targetHeight ) {
        return image;
    }
    if ( typeof image === "string" ) {
        let size;
        ({ image, size } = await loader.loadImage( image ));
        srcWidth  = size.width;
        srcHeight = size.height;
    }
    const { cvs, ctx } = createCanvas( targetWidth, targetHeight );
    ctx.drawImage(
        image, 0, 0, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight
    );
    return cvs;
};

export const resizeToBase64 = async ( image, srcWidth, srcHeight, targetWidth, targetHeight, mime, encoderOptions ) => {
    if ( typeof image === "string" ) {
        if ( srcWidth === targetWidth && srcHeight === targetHeight ) {
            return image;
        }
        ({ image } = await loader.loadImage( image ));
    }
    const cvs = await resizeImage( image, srcWidth, srcHeight, targetWidth, targetHeight );
    return cvs.toDataURL( mime, encoderOptions );
};

/**
 * Creates a snapshot of the current document at its full size, returns a Blob.
 */
export const createDocumentSnapshot = async ( activeDocument, type, quality ) => {
    const { width, height } = activeDocument;
    const tempCanvas = new canvas({ width, height });
    const ctx = tempCanvas.getElement().getContext( "2d" );

    // draw existing layers onto temporary canvas at full document scale
    activeDocument.layers.forEach( layer => {
        const sprite = getSpriteForLayer( layer );
        sprite.draw( ctx );
    });
    quality = parseFloat(( quality / 100 ).toFixed( 2 ));
    let base64 = tempCanvas.getElement().toDataURL( type, quality );
    tempCanvas.dispose();

    // zCanvas magnifies content by the pixel ratio for a crisper result, downscale
    // to actual dimensions of the document
    const resizedImage = await resizeToBase64(
        base64,
        width  * ( window.devicePixelRatio || 1 ),
        height * ( window.devicePixelRatio || 1 ),
        width, height,
        type, quality
    );
    // fetch final base64 data so we can convert it easily to binary
    base64 = await fetch( resizedImage );
    return await base64.blob();
};

/**
 * Copy the selection defined in activeLayer into a separate Image
 */
export const copySelection = async ( activeDocument, activeLayer ) => {
    const { width, height } = activeDocument;
    const tempCanvas = new canvas({ width, height });
    let ctx = tempCanvas.getElement().getContext( "2d" );
    const sprite = getSpriteForLayer( activeLayer );

    ctx.beginPath();
    activeLayer.selection.forEach(( point, index ) => {
        ctx[ index === 0 ? "moveTo" : "lineTo" ]( point.x, point.y );
    });
    ctx.closePath();
    ctx.save();
    ctx.clip();
    // draw active layer onto temporary canvas at full document scale
    sprite._isSelectMode = false; // prevents drawing selection outline into image
    sprite.draw( ctx );
    ctx.restore();

    const selectionRectangle = getRectangleForSelection( activeLayer.selection );
    const selectionCanvas = createCanvas( selectionRectangle.width, selectionRectangle.height );
    selectionCanvas.ctx.drawImage(
        tempCanvas.getElement(),
        selectionRectangle.left, selectionRectangle.top, selectionRectangle.width, selectionRectangle.height,
        0, 0, selectionRectangle.width, selectionRectangle.height
    );
    tempCanvas.dispose();
    return await loader.loadImage( selectionCanvas.cvs.toDataURL( PNG ));
};
