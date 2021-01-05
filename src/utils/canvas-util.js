/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
import { getSpriteForLayer } from "@/factories/sprite-factory";

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

export const imageToBase64 = ( bitmap, width, height, transparent ) => {
    let cvs;
    if ( bitmap instanceof Image ) {
        ({ cvs } = createCanvas( width, height ));
        cvs.getContext( "2d" ).drawImage( bitmap, 0, 0 );
        return cvs.toDataURL( transparent ? PNG : JPEG );
    } else if ( bitmap instanceof HTMLCanvasElement ) {
        cvs = bitmap;
        return cvs.toDataURL( PNG ); // Canvas sources are always transparent
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
 * The zCanvas displays content at a smaller scale, with optional
 * zoom. Event coordinates that should be local to the on-screen
 * display (for instance for color picking purposes) can be
 * transformed from global canvas coordinate space to local screen space.
 */
export const globalToLocal = ( zCanvas, x, y ) => {
    const factor = zCanvas.zoomFactor * zCanvas._HDPIscaleRatio;
    return {
        x: x * factor,
        y: y * factor
    }
};

/**
  * determines whether the pixel(s) at requested coordinate (or coordinate range) within the
  * given image is fully transparent
  *
  * @param {HTMLCanvasElement} source
  * @param {number} x x-coordinate within the image
  * @param {number} y y-coordinate within the image
  * @param {number=} size optional radius in pixels to verify
  * @return {boolean} value indicating whether coordinate is transparent
  */
export const isInsideTransparentArea = ( source, x, y, size = 5 ) => {
    const left   = x - size;
    const right  = x + size;
    const top    = y - size;
    const bottom = y + size;
    const width  = right - left;
    const height = bottom - top;

    // get list of RGBA values at the requested rectangle within given source
    const imageData = source.getContext( "2d" ).getImageData( left, top, size, size ).data;

    // How many solid pixels in the detection area do we need in order to mark it as non-transparent
    const requiredSolidPixels = Math.ceil(( width * height ) / 10 );
    let solidPixelsFound = 0;

    for ( x = 0; x < width; ++x ) {
        for ( y = 0; y < height; ++y ) {
            // 4 == the amount of indices for a single RGBA value
            // 3 == the index at which the alpha channel of the RGBA value is defined
            const index = (( Math.round( x ) + ( Math.round( y ) * width )) * 4 ) + 3;
            const pixel = imageData[ index ];

              if ( typeof pixel === "number" && pixel !== 0 ) {
                  if ( ++solidPixelsFound >= requiredSolidPixels ) {
                      return false;
                  }
              }
        }
    }
    return true;
};
