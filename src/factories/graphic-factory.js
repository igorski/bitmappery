/**
 * Creates a graphic to be displayed within the
 * layer of a Document
 */
export default {
    /**
     * @param {HTMLImageElement} bitmap
     * @param {Number=} x position of the bitmap within the layer
     * @param {Number=} y position of the bitmap within the layer
     * @param {Number=} width of the bitmap, defaults to actual bitmap width
     * @param {Number=} height of the bitmap, defaults to actual bitmap width
     */
    create( bitmap, x = 0, y = 0, width = -1, height = -1 ) {
        if ( width === -1 || height === -1 ) {
            ({ width, height } = bitmap);
        }
        return {
            bitmap, x, y, width, height
        };
    },
};
