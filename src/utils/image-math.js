/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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

/**
 * Calculates the appropriate dimensions for fitting an image of dimensions
 * described by imageWidth x imageHeight in a destination area described by
 * destWidth x destHeight while maintaining the image aspect ratio.
 * This imply that the image can either be cropped or requires the destination
 * area to be scrollable in order to be displayed in full.
 */
export const scaleToRatio = ( imageWidth, imageHeight, destWidth, destHeight ) => {
    let ratio  = 1;
    let height = destHeight;

    if ( imageWidth > imageHeight ) {
		ratio  = imageHeight / imageWidth;
		height = destWidth * ratio;
	}
    else if ( imageHeight > imageWidth ) {
	    ratio  = imageHeight / imageWidth;
		height = destWidth * ratio;
	}
    else if ( imageHeight === imageWidth ) {
		height = destWidth;
	}

    if ( height < destHeight ) {
        destWidth *= ( destHeight / height );
        height     = destHeight;
    }
    return {
        width: destWidth, height
    };
};

export const isPortrait  = ( width, height ) => width < height;
export const isLandscape = ( width, height ) => width > height;
export const isSquare    = ( width, height ) => width === height;
