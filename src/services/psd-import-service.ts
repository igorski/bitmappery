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
// @ts-expect-error no declaration file for module 'psd.js'
import PSD from "psd.js";
import type { Rectangle, Size } from "zcanvas";
import type { Document, Layer } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import type { LayerProps } from "@/factories/layer-factory";
import { inverseMask } from "@/rendering/compositing";
import { createCanvas, base64toCanvas } from "@/utils/canvas-util";
import { unblockedWait } from "@/utils/debounce-util";

type PSDLayer = Rectangle & {
    mask: Rectangle;
    opacity: number;
    visible: boolean;
    image: {
        hasMask: boolean;
        width: () => number;
        height: () => number;
        toBase64: () => string;
        maskData: {
            buffer: ArrayBuffer;
        }
    }
};

type PSDNode = {
    name: string;
    children: () => {
        length: number;
        reverse: () => {
            name: string;
            layer: PSDLayer;
        }[]
    }
};

type PSD = {
    tree: () => Size & PSDNode;
    image: {
        toPng: () => HTMLImageElement;
    },
};

export const importPSD = async ( psdFileReference: File ): Promise<Document> => {
    try {
        const psd = await PSD.fromDroppedFile( psdFileReference );
        await unblockedWait();
        const doc = await psdToBitMapperyDocument( psd, psdFileReference );
        return doc;
    } catch ( error ) {
        console.error( error );
        return null;
    }
};

/* internal methods */

async function psdToBitMapperyDocument( psd: any, psdFileReference: File ): Promise<Document> {
    const psdTree = psd.tree();
    const { width, height } = psdTree;

    // collect layers
    const layers: Layer[] = [];

    const treeLayerObjects = psdTree.children().reverse();
    for ( const layerObj of treeLayerObjects ) {
        const { layer } = layerObj;

        // 1. determine layer bounding box

        const children = layer.node?.children() ?? [];

        if ( children.length ) {
            // we are likely looking at a group layer
            for ( const childLayer of children.reverse() ) {
                await createLayer( childLayer.layer, layers, childLayer.name );
            }
        } else {
            await createLayer( layer, layers, layerObj.name );
        }
    }

    // also add the merged layer preview
    // (in case the above layer collection loop ran into an incompatibility issue
    // this provides a nice fallback that will always display content)

    layers.push( LayerFactory.create({
        name: "Flattened preview",
        width,
        height,
        source: psd.image.toPng()
    }));

    return DocumentFactory.create({
        name: psdTree.name || psdFileReference.name,
        width,
        height,
        layers
    });
}

async function createLayer( layer: PSDLayer, layers: Layer[], name = "" ): Promise<void> {
    const layerX      = layer.left;
    const layerY      = layer.top;
    const layerWidth  = layer.width;
    const layerHeight = layer.height;

    if ( !layerWidth || !layerHeight ) {
        return; // likely an adjustment layer, which we don't support
    }

    // 2. determine whether layer uses masking

    const layerProps: LayerProps = {};

    if ( layer.image.hasMask ) {
        // note that we position the mask at the 0, 0 coordinate relative to the layer, whereas Photoshop
        // positions the mask relative to the document
        const { cvs, ctx } = createCanvas( layer.mask.width, layer.mask.height );
        ctx.putImageData( new ImageData(
            new Uint8ClampedArray( layer.image.maskData.buffer ), layer.mask.width, layer.mask.height
        ), layer.mask.left - layerX, layer.mask.top - layerY );

        // Photoshop masks use inverted colours compared to our Canvas masking
        inverseMask( cvs );

        layerProps.mask = cvs;
    }

    // 3. retrieve layer source

    const source = layer.image ? await base64toCanvas( layer.image.toBase64(), layer.image.width(), layer.image.height() ) : null;

    layers.push( LayerFactory.create({
        visible : layer.visible,
        left    : layerX,
        top     : layerY,
        width   : layerWidth,
        height  : layerHeight,
        name,
        source,
        ...layerProps,
        filters : FiltersFactory.create({
            opacity: ( layer.opacity ?? 255 ) / 255,
        }),
    }));

    // layer bitmap parsing can be heavy, unblock CPU on each iteration
    await unblockedWait();
}
