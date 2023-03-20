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

// the height of the header displayed above the document canvas
export const HEADER_HEIGHT = 40;

// maximum width in pixels for an document whose multi-layered content can
// be merged into a spritesheet
export const MAX_SPRITESHEET_WIDTH = 512;

// the maximum size we support for an image, this is for the dominant side of the image
// the max is 8192 for IE with 32767 for Safari, FF and Chrome.
export const MAX_IMAGE_SIZE = 8192;
// the maximum amount of megapixels an image can be represented at in the application
export const MAX_MEGAPIXEL  = MAX_IMAGE_SIZE * MAX_IMAGE_SIZE;

const MIN_IMAGE_SIZE = 80;

/**
 * The minimum image size is set at 80 pixels but we should also support
 * even less when opening tiny images (for instance the source document of a pixel art sprite sheet)
 */
export const getMinImageSize = ( sourceWidth: number, sourceHeight: number ): number => {
    return Math.min( MIN_IMAGE_SIZE, Math.min( sourceWidth, sourceHeight ));
};
