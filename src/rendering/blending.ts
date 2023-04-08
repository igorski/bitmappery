/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
import type { Rectangle } from "zcanvas";
import { BlendModes } from "@/definitions/blend-modes";

type RGB = {
    r: number;
    g: number;
    b: number;
};

type HSV = {
    h: number;
    s: number;
    v: number;
};

export const blendLayer = ( dest: CanvasRenderingContext2D, source: CanvasRenderingContext2D, blendMode: BlendModes, bounds: Rectangle ): void => {
    const { left, top, width, height } = bounds;
    const srcD = source.getImageData( left, top, width, height );
	const dstD = dest.getImageData( left, top, width, height );

	const src  = srcD.data;
	const dst  = dstD.data;
	let sA, dA, len = dst.length;
	let sRA, sGA, sBA, dRA, dGA, dBA, dA2,
	    r1,g1,b1, r2,g2,b2;
	let demultiply;

    for ( let px = 0; px < len; px += 4 ) {
		sA  = src[px+3]/255;
		dA  = dst[px+3]/255;
		dA2 = (sA + dA - sA*dA);
		dst[px+3] = dA2*255;

		r1=dst[px], g1=dst[px+1], b1=dst[px+2];
		r2=src[px], g2=src[px+1], b2=src[px+2];

		sRA = r2/255*sA;
		dRA = r1/255*dA;
		sGA = g2/255*sA;
		dGA = g1/255*dA;
		sBA = b2/255*sA;
		dBA = b1/255*dA;

		demultiply = 255 / dA2;

		var f1=dA*sA, f2=dA-f1, f3=sA-f1;

		switch(blendMode){
			// ******* Very close match to Photoshop
			case 'normal':
			case 'src-over':
				dst[px  ] = (sRA + dRA - dRA*sA) * demultiply;
				dst[px+1] = (sGA + dGA - dGA*sA) * demultiply;
				dst[px+2] = (sBA + dBA - dBA*sA) * demultiply;
			break;

            default:
			case BlendModes.SCREEN:
				dst[px  ] = (sRA + dRA - sRA*dRA) * demultiply;
				dst[px+1] = (sGA + dGA - sGA*dGA) * demultiply;
				dst[px+2] = (sBA + dBA - sBA*dBA) * demultiply;
			break;

			case BlendModes.MULTIPLY:
				dst[px  ] = (sRA*dRA + sRA*(1-dA) + dRA*(1-sA)) * demultiply;
				dst[px+1] = (sGA*dGA + sGA*(1-dA) + dGA*(1-sA)) * demultiply;
				dst[px+2] = (sBA*dBA + sBA*(1-dA) + dBA*(1-sA)) * demultiply;
			break;

			case BlendModes.DIFFERENCE:
				dst[px  ] = (sRA + dRA - 2 * Math.min( sRA*dA, dRA*sA )) * demultiply;
				dst[px+1] = (sGA + dGA - 2 * Math.min( sGA*dA, dGA*sA )) * demultiply;
				dst[px+2] = (sBA + dBA - 2 * Math.min( sBA*dA, dBA*sA )) * demultiply;
			break;

			case BlendModes.LINEAR_DODGE:
				// Photoshop doesn't simply add the alpha channels; this might be correct wrt SVG 1.2
				dst[px  ] = Math.min(sRA + dRA,1) * demultiply;
				dst[px+1] = Math.min(sGA + dGA,1) * demultiply;
				dst[px+2] = Math.min(sBA + dBA,1) * demultiply;
			break;

			case BlendModes.OVERLAY:
				dst[px]   = f1*blendOverlay(r1,r2) + f2*r1 + f3*r2;
				dst[px+1] = f1*blendOverlay(g1,g2) + f2*g1 + f3*g2;
				dst[px+2] = f1*blendOverlay(b1,b2) + f2*b1 + f3*b2;
			break;

			case BlendModes.HARD_LIGHT:
				dst[px]   = f1*blendOverlay(r2,r1) + f2*r1 + f3*r2;
				dst[px+1] = f1*blendOverlay(g2,g1) + f2*g1 + f3*g2;
				dst[px+2] = f1*blendOverlay(b2,b1) + f2*b1 + f3*b2;
			break;

			case BlendModes.COLOR_DODGE:
				dst[px]   = f1*blendDodge(r1,r2) + f2*r1 + f3*r2;
				dst[px+1] = f1*blendDodge(g1,g2) + f2*g1 + f3*g2;
				dst[px+2] = f1*blendDodge(b1,b2) + f2*b1 + f3*b2;
			break;

			case BlendModes.COLOR_BURN:
				dst[px]   = f1*blendBurn(r1,r2) + f2*r1 + f3*r2;
				dst[px+1] = f1*blendBurn(g1,g2) + f2*g1 + f3*g2;
				dst[px+2] = f1*blendBurn(b1,b2) + f2*b1 + f3*b2;
			break;

			case BlendModes.DARKEN:
				dst[px]   = f1*(r1<r2 ? r1 : r2) + f2*r1 + f3*r2;
				dst[px+1] = f1*(g1<g2 ? g1 : g2) + f2*g1 + f3*g2;
				dst[px+2] = f1*(b1<b2 ? b1 : b2) + f2*b1 + f3*b2;
			break;

			case BlendModes.LIGHTEN:
				dst[px  ] = (sRA<dRA ? dRA : sRA) * demultiply;
				dst[px+1] = (sGA<dGA ? dGA : sGA) * demultiply;
				dst[px+2] = (sBA<dBA ? dBA : sBA) * demultiply;
			break;

			case BlendModes.EXCLUSION:
				dst[px  ] = (dRA+sRA - 2*dRA*sRA) * demultiply;
				dst[px+1] = (dGA+sGA - 2*dGA*sGA) * demultiply;
				dst[px+2] = (dBA+sBA - 2*dBA*sBA) * demultiply;
			break;

			case BlendModes.SOFT_LIGHT:
				dst[px]   = f1*blendSoftlight(r1,r2) + f2*r1 + f3*r2;
				dst[px+1] = f1*blendSoftlight(g1,g2) + f2*g1 + f3*g2;
				dst[px+2] = f1*blendSoftlight(b1,b2) + f2*b1 + f3*b2;
			break;

			case BlendModes.LUMINOSITY:
				var hsl  = rgb2YCbCr(r1,g1,b1);
				var hsl2 = rgb2YCbCr(r2,g2,b2);
				var rgb=YCbCr2rgb(hsl2.r, hsl.g, hsl.b);
				dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
				dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
				dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
			break;

			case BlendModes.COLOR:
				var hsl  = rgb2YCbCr(r1,g1,b1);
				var hsl2 = rgb2YCbCr(r2,g2,b2);
				var rgb=YCbCr2rgb(hsl.r, hsl2.g, hsl2.b);
				dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
				dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
				dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
			break;

			case BlendModes.HUE:
				var hsl =rgb2hsv(r1,g1,b1);
				var hsl2=rgb2hsv(r2,g2,b2);
				var rgb=hsv2rgb(hsl2.h, hsl.s, hsl.v);
				dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
				dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
				dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
			break;

			case BlendModes.SATURATION:
				var hsl =rgb2hsv(r1,g1,b1);
				var hsl2=rgb2hsv(r2,g2,b2);
				var rgb=hsv2rgb(hsl.h, hsl2.s, hsl.v);
				dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
				dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
				dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
			break;

			case BlendModes.LIGHTER_COLOR:
				var rgb = 2.623*(r1-r2)+5.15*(g1-g2)+b1-b2>0 ? {r:r1,g:g1,b:b1} : {r:r2,g:g2,b:b2};
				dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
				dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
				dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
			break;

			case BlendModes.DARKER_COLOR:
				var rgb = 2.623*(r1-r2)+5.15*(g1-g2)+b1-b2<0 ? {r:r1,g:g1,b:b1} : {r:r2,g:g2,b:b2};
				dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
				dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
				dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
			break;

		}
	}
    dest.putImageData( dstD, left, top );
};

/* internal methods */

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

function rgb2YCbCr( r: number, g: number, b: number ): RGB {
    return {
        r: 0.2990  * r +0.5870 * g + 0.1140 * b,
        g: -0.1687 * r -0.3313 * g + 0.5000 * b,
        b: 0.5000  * r -0.4187 * g - 0.0813 * b
    };
}

function YCbCr2rgb( r: number, g: number, b: number ): RGB {
    return {
        r: r + 1.4020 *b,
        g: r - 0.3441 * g - 0.7141 * b,
        b: r + 1.7720 * g
    };
}

function rgb2hsv( r: number, g: number, b: number ): HSV {
    const c = rgb2YCbCr( r, g, b );
    const s = Math.sqrt( c.g * c.g + c.b * c.b );
    const h = Math.atan2( c.g, c.b );
    return {
        h, s, v: c.r
    };
}

function hsv2rgb( h: number, s: number, v: number ): RGB {
    const g = s * Math.sin( h );
    const b = s * Math.cos( h );
    return YCbCr2rgb( v, g, b );
}
