/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022 - https://www.igorski.nl
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
import gifshot from "gifshot";

/**
 * Whether the current environment supports creation of GIF images
 */
export const supportsGIF = () => gifshot.isExistingImagesGIFSupported();

/**
 * Create a GIF from given image
 *
 * @param {HTMLCanvasElement} image
 * @return {String} base64 encoded GIF
 */
export const createGIF = image => createAnimatedGIF([ image ]);

/**
 * Create an animated GIF from a list of images
 *
 * @param {Array<HTMLCanvasElement>} images
 * @param {Number} frameDuration (10 = 1s) interval between frames
 * @return {String} base64 encoded GIF animation
 */
export const createAnimatedGIF = ( images, frameDuration = 1 ) => {
    const options = {
        gifWidth  : images[ 0 ].width,
        gifHeight : images[ 0 ].height,
        frameDuration
    };
    return new Promise(( resolve, reject ) => {
        gifshot.createGIF({ images, ...options }, ({ error, image }) => {
            if ( error ) {
                reject();
            } else {
                resolve( image );
            }
        });
    });
};
