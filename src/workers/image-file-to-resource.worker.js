/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
import { blobToResource, disposeResource } from "@/utils/resource-manager.js";

self.addEventListener( "message", event => {
    const { cmd, file } = event.data;
    switch ( cmd ) {
        default:
            return;

        case "loadImageFile":
            const blobUrl = blobToResource( file );
            self.createImageBitmap( file )
                .then( result => {
                    const { width, height } = result;
                    self.postMessage({
                        cmd: "loadComplete",
                        file: file.name,
                        blobUrl,
                        width,
                        height
                    });
                })
                .catch( error => {
                    disposeResource( blobUrl ); // deallocate as file will be useless
                    self.postMessage({
                        cmd: "loadError",
                        file: file.name,
                        error
                    });
                });
            break;
    }
});
