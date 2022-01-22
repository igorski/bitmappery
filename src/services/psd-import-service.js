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

export const importPSD = async psdFileReference => {
    try {
        const psd = await PSD.fromDroppedFile( psdFileReference );
        return psdToBitMapperyDocument( psd, psdFileReference );
    } catch ( error ) {
        console.error( error );
        return null;
    }
};

/* internal methods */

function psdToBitMapperyDocument( psd, psdFileReference ) {
    const psdTree = psd.tree();
    const { width, height } = psdTree;

    // collect layers
    const layers = [];

    psdTree.children().reverse().forEach( layerObj => {
        const { layer } = layerObj;

        if ( !layer.width || !layer.height ) {
            // these are likely adjustment layers, which we don't support
            return;
        }

        layers.push( LayerFactory.create({
            name    : layerObj.name,
            x       : layer.left,
            y       : layer.top,
            width   : layer.width,
            height  : layer.height,
            visible : layer.visible,
            source  : layer.image ? layer.image.toPng() : null,
            filters : FiltersFactory.create({
                opacity: ( layer.opacity ?? 255 ) / 255,
            }),
        }));
    });
    return DocumentFactory.create({
        name: psdTree.name || psdFileReference.name,
        width,
        height,
        layers
    });
}
