/**
* The MIT License (MIT)
*
* Igor Zinken 2019-2021 - https://www.igorski.nl
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
export const saveBlobAsFile = ( blob, fileName ) => {
    const blobURL = URL.createObjectURL( blob );
    const anchor  = document.createElement( "a" );
    anchor.style.display = "none";
    anchor.href = blobURL;
    anchor.setAttribute( "download", fileName );

    // Safari has no download attribute
    if ( typeof anchor.download === "undefined" ) {
        anchor.setAttribute( "target", "_blank" );
    }
    document.body.appendChild( anchor );
    anchor.click();
    document.body.removeChild( anchor );
    URL.revokeObjectURL( blobURL );
};

export const selectFile = ( acceptedTypes, multiple = false ) => {
    const fileBrowser = document.createElement( "input" );
    fileBrowser.setAttribute( "type",   "file" );
    fileBrowser.setAttribute( "accept", acceptedTypes );
    if ( multiple ) {
        fileBrowser.setAttribute( "multiple", "multiple" );
    }

    const simulatedEvent = document.createEvent( "MouseEvent" );
    simulatedEvent.initMouseEvent(
        "click", true, true, window, 1,
        0, 0, 0, 0, false,
        false, false, false, 0, null
    );
    fileBrowser.dispatchEvent( simulatedEvent );
    return new Promise(( resolve, reject ) => {
        fileBrowser.onchange = ({ target }) => resolve( target.files );
        fileBrowser.onerror  = reject;
    });
};

export const readFile = file => {
    const reader = new FileReader();
    return new Promise(( resolve, reject ) => {
        reader.onload = readerEvent => {
            resolve( readerEvent.target.result );
        };
        reader.onerror = reject;
        reader.readAsText( file );
    });
};
