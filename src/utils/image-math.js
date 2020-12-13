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
    return {
        width: destWidth, height
    };
};
