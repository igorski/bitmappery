/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017-2022 - https://www.igorski.nl
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
import Bowser from "bowser";

let fsToggle: HTMLElement;
let fsCallback: ( isFullScreen: boolean ) => void;
let clientData: any;

export const isMobile = (): boolean => window.screen.availWidth <= 640; // see _variables.scss

// on non-mobile environments we allow focusing of the first form element within a component
// on mobile we don't do this as (depending on OS) this would force the keyboard to popup
export const focus = ( element: HTMLElement ): void => !isMobile() && element?.focus();

export const supportsFullscreen = (): boolean => getClientData().os?.name !== "iOS";

export const isSafari = (): boolean => getClientData().browser?.name === "Safari";

export const setToggleButton = ( element: HTMLElement, callback: () => void ): void => {
    const d = window.document;

    fsToggle = element;
    fsToggle.addEventListener( "click", toggleFullscreen );

    fsCallback = callback;

    [ "webkitfullscreenchange", "mozfullscreenchange", "fullscreenchange", "MSFullscreenChange" ]
    .forEach( event => d.addEventListener( event, handleFullscreenChange, false ));
};

/* internal methods */

export const toggleFullscreen = (): void => {
    const d = window.document;
    let requestMethod: () => void;
    let element: any;

    // @ts-expect-error vendor specific prefixes
    if ( d.fullscreenElement || d.webkitFullscreenElement ) {
        // @ts-expect-error vendor specific prefixes
        requestMethod = d.exitFullscreen || d.webkitExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen;
        element = d;
    } else {
        // @ts-expect-error vendor specific prefixes
        requestMethod = d.body.requestFullScreen || d.body.webkitRequestFullScreen || d.body.mozRequestFullScreen || d.body.msRequestFullscreen;
        element = d.body;
    }
    if ( requestMethod ) {
        requestMethod.call( element );
    }
}

function handleFullscreenChange(): void {
    // @ts-expect-error vendor specific prefixes
    fsCallback( document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement === true );
}

function getClientData(): any {
    if ( !clientData && typeof window !== "undefined" ) {
        // @ts-expect-error parsedResult not recognized
        clientData = Bowser.getParser( window.navigator.userAgent ).parsedResult;
    }
    return clientData || {};
}
