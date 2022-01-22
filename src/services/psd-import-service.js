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
import PSD from "psd.js";
import DocumentFactory from "@/factories/document-factory";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import { inverseMask } from "@/rendering/compositing";
import { createCanvas, base64toCanvas } from "@/utils/canvas-util";
import { debounce } from "@/utils/debounce-util";

export const importPSD = async psdFileReference => {
    try {
        const psd = await PSD.fromDroppedFile( psdFileReference );
        const doc = await psdToBitMapperyDocument( psd, psdFileReference );
        return doc;
    } catch ( error ) {
        console.error( error );
        return null;
    }
};

/* internal methods */

async function psdToBitMapperyDocument( psd, psdFileReference ) {
    const psdTree = psd.tree();
    const { width, height } = psdTree;

    // collect layers
    const layers = [];

    const treeLayerObjects = psdTree.children().reverse();
    for ( const layerObj of treeLayerObjects ) {
        const { layer } = layerObj;

        // 1. determine layer bounding box

        if ( !layer.width || !layer.height ) {
            // these are likely adjustment layers, which we don't support
            continue;
        }

        let layerX      = layer.left;
        let layerY      = layer.top;
        let layerWidth  = layer.width;
        let layerHeight = layer.height;

        // 2. determine whether layer uses masking

        const maskProps = {};

        if ( layer.image.hasMask ) {
            // note that we position mask the mask at the 0, 0 relative to the layer, whereas Photoshop positions
            // it relative to the entire document
            const { cvs, ctx } = createCanvas( layer.mask.width, layer.mask.height );
            ctx.putImageData( new ImageData(
                new Uint8ClampedArray( layer.image.maskData.buffer ), layer.mask.width, layer.mask.height
            ), layer.mask.left - layerX, layer.mask.top - layerY );

            // Photoshop masks use inverted colours compared to our Canvas masking
            inverseMask( cvs );

            maskProps.mask = cvs;
        }

        // 3. retrieve layer source

        const source = layer.image ? await base64toCanvas( layer.image.toBase64(), layer.image.width(), layer.image.height() ) : null;

        layers.push( LayerFactory.create({
            name    : layerObj.name,
            visible : layer.visible,
            x       : layerX,
            y       : layerY,
            width   : layerWidth,
            height  : layerHeight,
            source,
            ...maskProps,
            filters : FiltersFactory.create({
                opacity: ( layer.opacity ?? 255 ) / 255,
            }),
        }));

        // layer bitmap parsing can be heavy, unblock CPU on each iteration
        await debounce();
    }

    if ( !layers.length ) {
        // we likely ran into some incompatibility issue, just take the merged output
        layers.push( LayerFactory.create({
            name: "Merged",
            width,
            height,
            source: psd.image.toPng()
        }));
    }

    return DocumentFactory.create({
        name: psdTree.name || psdFileReference.name,
        width,
        height,
        layers
    });
}
