/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
import { createCanvas } from "@/utils/canvas-util";

const loadedFonts      = new Set();
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css?family=";

// Google Fonts deemed non-GDPR compliant. Request consent first
export const fontsConsented = () => window.localStorage?.getItem( "gfontConsent" ) === "true";

export const consentFonts = () => {
    window.localStorage?.setItem?.( "gfontConsent", "true" );
};

export const rejectFonts = () => {
    window.localStorage?.setItem?.( "gfontRejected", "true" );
};

/**
 * Lazily loads a Google font (defined in the list above)
 * Returns boolean true indicating whether font was cache
 * or false when it has just been loaded (and added to the cache)
 */
export const loadGoogleFont = fontName => {
    return new Promise(( resolve, reject ) => {
        if ( !fontsConsented() ) {
            reject();
            return;
        }
        if ( loadedFonts.has( fontName )) {
            resolve( true );
            return;
        }
        const css = document.createElement( "link" );
        css.setAttribute( "rel", "stylesheet" );
        css.setAttribute( "type", "text/css" );
        css.onload = () => {
            loadedFonts.add( fontName );
            // CSS file has loaded, but font hasn't, create first request for font render
            const { ctx } = createCanvas();
            ctx.font = `16px ${fontName}`;
            ctx.fillText( "foo", 0, 0 );
            // the above will have requested the font file, resolve Promise after slight delay
            window.setTimeout(() => {
                resolve( false );
            }, 250 );
        };
        css.onerror = e => {
            console.error( `Could not load font ${fontName}`, e );
            reject();
        }
        css.setAttribute( "href", `${GOOGLE_FONTS_URL}${fontName}` );
        document.getElementsByTagName( "head" )[ 0 ].appendChild( css );
    });
};
