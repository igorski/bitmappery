import { loader } from "zcanvas";

/**
 * Load a list of Image files in series.
 * Each consecutive load is debounced by a DOM update to ensure that the main execution
 * stack isn't flooded and to maintain application responsiveness
 *
 * @param {FileList} fileList of images
 * @param {Function} callback to execute for each loaded file (receives file and zCanvas load result as arguments)
 * @param {ctx} Vue component instance used for debouncing synced to the Vue render task queue
 */
export const loadImageFiles = async ( fileList, callback, ctx ) => {
    for ( let i = 0; i < fileList.length; ++i ) {
        const file   = fileList[ i ];
        const result = await loadFile( file );
        await ctx.$nextTick(); // free up main thread for updating before continuing
        await callback( file, result );
        await ctx.$nextTick(); // free up main thread for updating before continuing
    }
};

/* internal methods */

function loadFile( file ) {
    const reader = new FileReader();
    return new Promise(( resolve, reject ) => {
        reader.onload = async ( event ) => {
            // load the image contents using the zCanvas.loader
            // which will also provide the image dimensions
            try {
                const imageSource = reader.result;
                const result = await loader.loadImage( imageSource );
                resolve( result );
            } catch {
                reject();
            }
        };
        reader.readAsDataURL( file );
    });
}