import { createCanvas } from './canvas-util';

const { URL } = window;

/**
 * Creates a Blob URL for the resource represented by given imageElement.
 * By treating referenced Image resources as URLs to binary content, the browser
 * can use its internal loading/caching mechanism when working with these resources.
 * NOTE: When done using the image, don't forget to call dispose() to free allocated memory.
 *
 * @param {HTMLImageElement} imageElement fully loaded image
 * @param {String=} type optional mime type, defaults to JPEG for photographic content
 * @param {Number=} optQuality optional JPEG compression to use (when mime is JPEG)
 * @return {String} Blob URL
 */
export const imageToSource = async ( imageElement, type = "image/jpeg", optQuality = 90 ) => {
    const { cvs, ctx } = createCanvas();

    cvs.width  = imageElement.clientWidth;
    cvs.height = imageElement.clientHeight;

    ctx.drawImage( imageElement, 0, 0 );

    return new Promise(( resolve, reject ) => {
        try {
            cvs.toBlob(( blob ) => {
                resolve( URL.createObjectURL( blob ));
            }, type, optQuality );
        } catch ( error ) {
            reject( error );
        }
    });
};

export const disposeSource = imageBlobURL => {
    URL.revokeObjectURL( imageBlobURL );
};
