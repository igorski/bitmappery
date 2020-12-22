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
import { loader }    from "zcanvas";
import { JPEG, PNG } from "@/definitions/image-types";
import { LAYER_GRAPHIC, LAYER_IMAGE, LAYER_MASK } from "@/definitions/layer-types";

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

export const resizeImage = async ( image, srcWidth, srcHeight, targetWidth, targetHeight ) =>
{
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
    const cvs = await resizeImage( image, srcWidth, srcHeight, targetWidth, targetHeight );
    return cvs.toDataURL( mime, encoderOptions );
}
