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
// @ts-expect-error no declaration module for module 'gifshot'
import gifshot from "gifshot";

/**
 * Whether the current environment supports creation of GIF images
 */
export const supportsGIF = (): boolean => gifshot.isExistingImagesGIFSupported();

/**
 * Create a base64 encoded GIF from given image
 */
export const createGIF = ( image: HTMLCanvasElement ): Promise<string> => createAnimatedGIF([ image ]);

/**
 * Create a base64 encoded animated GIF from a list of images
 *
 * @param {Array<HTMLCanvasElement>} images
 * @param {Number} frameDuration (10 = 1s) interval between frames
 * @return {String} base64 encoded GIF animation
 */
export const createAnimatedGIF = ( images: HTMLCanvasElement[], frameDuration = 1 ): Promise<string> => {
    const options = {
        gifWidth  : images[ 0 ].width,
        gifHeight : images[ 0 ].height,
        frameDuration
    };
    return new Promise(( resolve, reject ) => {
        gifshot.createGIF({ images, ...options }, ({ error, image }: { error: Error, image: string }): void => {
            if ( error ) {
                reject();
            } else {
                resolve( image );
            }
        });
    });
};
