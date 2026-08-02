/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023-2026 - https://www.igorski.nl, math fallback adapted from source of:
 * Context Blender JavaScript Library
 * Copyright © 2010 Gavin Kistner
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
import { BlendModes } from "@/definitions/blend-modes";
import type { RGB /*, HSV */ } from "@/definitions/colors";
import { createCanvas, getPixelRatio } from "@/utils/canvas-util";
// import { rgb2YCbCr, YCbCr2rgb, rgb2hsv, hsv2rgb } from "@/utils/color-util";

const { cvs, ctx } = createCanvas();

/**
 * All blend modes can be performed using globalCompositeOperation omitting
 * the need for an expensive call to getImageData() while providing the benefit
 * that it is GPU powered. There are some modes that aren't supported out of the box though...
 */
export const isNativeBlendMode = ( blendMode: BlendModes ): boolean => {
    return blendMode !== BlendModes.LIGHTER_COLOR
        && blendMode !== BlendModes.DARKER_COLOR;
};

/**
 * Return the appropriate context for drawing layer content on using the provided blendMode.
 * This will just apply the appropriate composite operation on the existing drawContext for
 * all native blend modes. For the non-native blend modes, a pooled empty context is
 * returned on which ImageData manipulations can take place.
 *
 * @param {CanvasRenderingContext2D} documentContext references canvas to match dimensions of
 * @param {BlendModes} blendMode which will be used during the blendLayer() call
 * @param {number=} opacity optional opacity to apply
 * @param {boolean=} isSnapshotMode whether blending will be applied within high res snapshot mode
 * @param {number=} zoomFactor current zoom level of the document canvas
 */
export const prepareBlend = (
    documentContext: CanvasRenderingContext2D, blendMode: BlendModes, opacity = 1, isSnapshotMode = false, zoomFactor = 1
): CanvasRenderingContext2D => {
    let context = documentContext;

    if ( isNativeBlendMode( blendMode )) {
        context.save(); // restored on applyBlend()
        applyNativeCompositeOperation( context, blendMode );
    } else {
        context = ctx; // use pooled canvas

        const { width, height } = documentContext.canvas;

        cvs.width  = width;
        cvs.height = height;

        const scaleFactor = isSnapshotMode ? getPixelRatio() : getPixelRatio() * zoomFactor;
        ctx.scale( scaleFactor, scaleFactor );
    }
    context.globalAlpha = opacity;

    return context;
};

/**
 * Blend the contents of a Layer onto the underlying Document content
 *
 * @param {CanvasRenderingContext2D} source the context that contains the content of the Layer (see prepareBlend())
 * @param {CanvasRenderingContext2D} dest the context that contains all rendered content below the Layer 
 * @param {BlendModes} blendMode the blend mode to use
 */
export const applyBlend = (
    source: CanvasRenderingContext2D, dest: CanvasRenderingContext2D, blendMode: BlendModes,
): void => {
    if ( isNativeBlendMode( blendMode )) {
        // native blend will have been applied directly during the regular bitmap render routine using
        // the appropriate composite operation applied in prepareBlend(), just restore the original context
        source.restore();
        return;
    }

    let left = 0;
    let top = 0;
    let { width, height } = dest.canvas;

    // math based blending, this comes with a higher performance cost

    const srcImageData: ImageData = source.getImageData( left, top, width, height );
    const dstImageData: ImageData = dest.getImageData( left, top, width, height );

    const src: Uint8ClampedArray = srcImageData.data;
    const dst: Uint8ClampedArray = dstImageData.data;
    const size = dst.length;

    let rgb: RGB;
    // let hsl: RGB;
    // let hsl2: RGB;
    // let hsv: HSV;
    // let hsv2: HSV;

    for ( let px = 0; px < size; px += 4 ) {
        // alpha channel
        const sA  = src[ px + 3 ] / 255;
        const dA  = dst[ px + 3 ] / 255;
        const dA2 = ( sA + dA - sA * dA );

        dst[ px + 3 ] = dA2 * 255;

        // grab RGB values
        const r1 = dst[ px ];
        const g1 = dst[ px + 1 ];
        const b1 = dst[ px + 2 ];
        const r2 = src[ px ];
        const g2 = src[ px + 1 ];
        const b2 = src[ px + 2 ];

        // const sRA = r2 / 255 * sA;
        // const dRA = r1 / 255 * dA;
        // const sGA = g2 / 255 * sA;
        // const dGA = g1 / 255 * dA;
        // const sBA = b2 / 255 * sA;
        // const dBA = b1 / 255 * dA;

        // const demultiply = 255 / dA2;

        const f1 = dA * sA, f2 = dA - f1, f3 = sA - f1;

        switch( blendMode ) {
            default:
                throw new Error( `native composite operation should be used instead for blendMode ${blendMode}` );
                break;
            /*
            case BlendModes.SCREEN:
                dst[ px ]     = ( sRA + dRA - sRA * dRA ) * demultiply;
                dst[ px + 1 ] = ( sGA + dGA - sGA * dGA ) * demultiply;
                dst[ px + 2 ] = ( sBA + dBA - sBA * dBA ) * demultiply;
                break;

            case BlendModes.MULTIPLY:
                dst[ px ]     = ( sRA * dRA + sRA * ( 1 - dA ) + dRA * ( 1 - sA )) * demultiply;
                dst[ px + 1 ] = ( sGA * dGA + sGA * ( 1 - dA ) + dGA * ( 1 - sA )) * demultiply;
                dst[ px + 2 ] = ( sBA * dBA + sBA * ( 1 - dA ) + dBA * ( 1 - sA )) * demultiply;
                break;

            case BlendModes.DIFFERENCE:
                dst[ px ]     = ( sRA + dRA - 2 * Math.min( sRA * dA, dRA * sA )) * demultiply;
                dst[ px + 1 ] = ( sGA + dGA - 2 * Math.min( sGA * dA, dGA * sA )) * demultiply;
                dst[ px + 2 ] = ( sBA + dBA - 2 * Math.min( sBA * dA, dBA * sA )) * demultiply;
                break;

            case BlendModes.LINEAR_DODGE:
                dst[ px ]     = Math.min( sRA + dRA, 1 ) * demultiply;
                dst[ px + 1 ] = Math.min( sGA + dGA, 1 ) * demultiply;
                dst[ px + 2 ] = Math.min( sBA + dBA, 1 ) * demultiply;
                break;

            case BlendModes.OVERLAY:
                dst[ px]      = f1 * blendOverlay( r1, r2 ) + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * blendOverlay( g1, g2 ) + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * blendOverlay( b1, b2 ) + f2 * b1 + f3 * b2;
                break;

            case BlendModes.HARD_LIGHT:
                dst[ px]      = f1 * blendOverlay( r2, r1 ) + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * blendOverlay( g2, g1 ) + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * blendOverlay( b2, b1 ) + f2 * b1 + f3 * b2;
                break;

            case BlendModes.COLOR_DODGE:
                dst[ px]      = f1 * blendDodge( r1, r2 ) + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * blendDodge( g1, g2 ) + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * blendDodge( b1, b2 ) + f2 * b1 + f3 * b2;
                break;

            case BlendModes.COLOR_BURN:
                dst[ px ]     = f1 * blendBurn( r1, r2 ) + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * blendBurn( g1, g2 ) + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * blendBurn( b1, b2 ) + f2 * b1 + f3 * b2;
                break;

            case BlendModes.DARKEN:
                dst[ px ]     = f1 * ( r1 < r2 ? r1 : r2 ) + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * ( g1 < g2 ? g1 : g2 ) + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * ( b1 < b2 ? b1 : b2 ) + f2 * b1 + f3 * b2;
                break;

            case BlendModes.LIGHTEN:
                dst[ px ]     = ( sRA < dRA ? dRA : sRA ) * demultiply;
                dst[ px + 1 ] = ( sGA < dGA ? dGA : sGA ) * demultiply;
                dst[ px + 2 ] = ( sBA < dBA ? dBA : sBA ) * demultiply;
                break;

            case BlendModes.EXCLUSION:
                dst[ px ]     = ( dRA + sRA - 2 * dRA * sRA ) * demultiply;
                dst[ px + 1 ] = ( dGA + sGA - 2 * dGA * sGA ) * demultiply;
                dst[ px + 2 ] = ( dBA + sBA - 2 * dBA * sBA ) * demultiply;
                break;

            case BlendModes.SOFT_LIGHT:
                dst[ px ]     = f1 * blendSoftlight( r1, r2 ) + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * blendSoftlight( g1, g2 ) + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * blendSoftlight( b1, b2 ) + f2 * b1 + f3 * b2;
                break;

            case BlendModes.LUMINOSITY:
                hsl  = rgb2YCbCr( r1, g1, b1 );
                hsl2 = rgb2YCbCr( r2, g2, b2 );
                rgb  = YCbCr2rgb( hsl2.r, hsl.g, hsl.b );

                dst[ px ]     = f1 * rgb.r + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * rgb.g + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * rgb.b + f2 * b1 + f3 * b2;
                break;

            case BlendModes.COLOR:
                hsl  = rgb2YCbCr( r1, g1, b1 );
                hsl2 = rgb2YCbCr( r2, g2, b2 );
                rgb  = YCbCr2rgb( hsl.r, hsl2.g, hsl2.b );

                dst[ px ]     = f1 * rgb.r + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * rgb.g + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * rgb.b + f2 * b1 + f3 * b2;
                break;

            case BlendModes.HUE:
                hsv  = rgb2hsv( r1, g1, b1 );
                hsv2 = rgb2hsv( r2, g2, b2 );
                rgb  = hsv2rgb( hsv2.h, hsv.s, hsv.v );

                dst[ px ]     = f1 * rgb.r + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * rgb.g + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * rgb.b + f2 * b1 + f3 * b2;
                break;

            case BlendModes.SATURATION:
                hsv  = rgb2hsv( r1, g1, b1 );
                hsv2 = rgb2hsv( r2, g2, b2 );
                rgb  = hsv2rgb( hsv.h, hsv2.s, hsv.v );

                dst[ px ]     = f1 * rgb.r + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * rgb.g + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * rgb.b + f2 * b1 + f3 * b2;
                break;
            */
            case BlendModes.LIGHTER_COLOR:
                if ( isLighter( r1, g1, b1, r2, g2, b2 )) {
                    rgb = { r: r1, g: g1, b: b1 };
                } else {
                    rgb = { r: r2, g: g2, b: b2 };
                }
                dst[ px ]     = f1 * rgb.r + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * rgb.g + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * rgb.b + f2 * b1 + f3 * b2;
                break;

            case BlendModes.DARKER_COLOR:
                if ( !isLighter( r1, g1, b1, r2, g2, b2 )) {
                    rgb = { r: r1, g: g1, b: b1 };
                } else {
                    rgb = { r: r2, g: g2, b: b2 };
                }
                dst[ px ]     = f1 * rgb.r + f2 * r1 + f3 * r2;
                dst[ px + 1 ] = f1 * rgb.g + f2 * g1 + f3 * g2;
                dst[ px + 2 ] = f1 * rgb.b + f2 * b1 + f3 * b2;
                break;
        }
    }
    dest.putImageData( dstImageData, left, top );

    // free allocated memory of temp context
    source.canvas.width = source.canvas.height = 1;
};

/* internal methods */

function applyNativeCompositeOperation( ctx: CanvasRenderingContext2D, blendMode: BlendModes ): void {
    let op = ctx.globalCompositeOperation;

    switch ( blendMode ) {
        default:
        case BlendModes.NORMAL:
            op = "source-over";
            break;
        case BlendModes.DARKEN:
            op = "darken";
            break;
        case BlendModes.MULTIPLY:
            op = "multiply";
            break;
        case BlendModes.COLOR_BURN:
            op = "color-burn";
            break;
        case BlendModes.LIGHTEN:
            op = "lighten";
            break;
        case BlendModes.SCREEN:
            op = "screen";
            break;
        case BlendModes.COLOR_DODGE:
            op = "color-dodge";
            break;
        case BlendModes.LINEAR_DODGE:
            op = "lighter";
            break;
        case BlendModes.OVERLAY:
            op = "overlay";
            break;
        case BlendModes.SOFT_LIGHT:
            op = "soft-light";
            break;
        case BlendModes.HARD_LIGHT:
            op = "hard-light";
            break;
        case BlendModes.DIFFERENCE:
            op = "difference";
            break;
        case BlendModes.EXCLUSION:
            op = "exclusion";
            break;
        case BlendModes.HUE:
            op = "hue";
            break;
        case BlendModes.SATURATION:
            op = "saturation";
            break;
        case BlendModes.COLOR:
            op = "color";
            break;
        case BlendModes.LUMINOSITY:
            op = "luminosity";
            break;
    }
    ctx.globalCompositeOperation = op;
}

/**
 * Verifies whether the first given RGB values are lighter than the second
 */
function isLighter( r1: number, g1: number, b1: number, r2: number, g2: number, b2: number ): boolean {
    return 2.623 * ( r1 - r2 ) + 5.15 * ( g1 - g2 ) + b1 - b2 > 0;
}

/* blend operations */

function blendSoftlight( a: number, b: number ): number {
    const b2 = b << 1;
    if ( b < 128 ) {
        return ( a * ( b2 +( a * ( 255 - b2 ) >> 8 ))) >> 8;
    }
    return ( a * ( 511 - b2 ) + ( Math.sqrt( a << 8 ) * ( b2 - 255 ))) >> 8;
}

function blendOverlay( a: number, b: number ): number {
    return a < 128 ? ( a * b ) >> 7 : 255 - (( ( 255 - b ) * ( 255 - a )) >> 7 );
}

function blendDodge( a: number, b: number ): number {
    return ( b === 255 && a === 0 ) ? 255 : Math.min( 255, ( a << 8 ) / ( 255 - b ));
}

function blendBurn( a: number, b: number ): number {
    return ( b === 255 && a === 0 ) ? 0 : 255 - Math.min( 255, (( 255 - a ) << 8 ) / b );
}
