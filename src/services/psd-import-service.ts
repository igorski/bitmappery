/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022-2023 - https://www.igorski.nl
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
import PSD from "@webtoon/psd";
import type { Node } from "@webtoon/psd";
import type { Rectangle, Size } from "zcanvas";
import { BlendModes } from "@/definitions/blend-modes";
import type { Document, Layer } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import type { LayerProps } from "@/factories/layer-factory";
import { inverseMask } from "@/rendering/compositing";
import { createCanvas, byteArrayToCanvas } from "@/utils/canvas-util";
import { unblockedWait, unblockedWaitUnlessFree } from "@/utils/debounce-util";

export const importPSD = async ( psdFileReference: File ): Promise<Document> => {
    try {
        const psd = await PSD.parse( await psdFileReference.arrayBuffer() );
        await unblockedWait();
        const doc = await psdToBitMapperyDocument( psd, psdFileReference );
        return doc;
    } catch ( error ) {
        console.error( error );
        return null;
    }
};

/* internal methods */

async function psdToBitMapperyDocument( psd: PSD, psdFileReference: File ): Promise<Document> {
    const { width, height } = psd;

    // collect content
    const layers: Layer[] = [];
    for ( const node of psd.children ) {
        await traverseNode( node, layers );
    }

    // also add the merged layer preview
    // (in case the above layer collection loop ran into an incompatibility issue
    // this provides a nice fallback that will always display content)

    const composite = await psd.composite();
    layers.push( LayerFactory.create({
        name: "Flattened preview",
        width,
        height,
        source: byteArrayToCanvas( composite, width, height )
    }));

    return DocumentFactory.create({
        name: psdFileReference.name,
        width,
        height,
        layers
    });
}

async function traverseNode( node: Node, output: Layer[] ): void {
    switch ( node.type ) {
        default:
            throw new Error( `Unsupported node type "${node.type}"` );
        case "Layer":
            await createLayer( node, output, node.name );
            break;
        case "Group":
            for ( const childNode of node.children ) {
                await traverseNode( childNode, output );
            }
            break;
        case "Psd":
            break;
    }

    if ( !node.children ) {
        return;
    }

    for ( const childNode of node.children ) {
        await traverseNode( childNode, output );
    }
}

async function createLayer( layer: PSDLayer, layers: Layer[], name = "" ): Promise<void> {
    const layerX      = layer.left;
    const layerY      = layer.top;
    const layerWidth  = layer.width;
    const layerHeight = layer.height;

    if ( layerWidth <= 1 && layerHeight <= 1 ) {
        return; // likely an adjustment layer, which we don't support
    }

    // 2. determine whether layer uses masking

    const layerProps: LayerProps = {};

    if ( layer.layerFrame?.userMask?.data ) {
        // note that we position the mask at the 0, 0 coordinate relative to the layer, whereas Photoshop
        // positions the mask relative to the document
        const maskWidth  = layer.maskData.right  - layer.maskData.left;
        const maskHeight = layer.maskData.bottom - layer.maskData.top;
        const { cvs, ctx } = createCanvas( maskWidth, maskHeight );

        const maskData = await layer.userMask();

        ctx.putImageData(
            new ImageData( new Uint8ClampedArray( maskData ), maskWidth, maskHeight ),
            layer.maskData.left - layerX, layer.maskData.top - layerY
        );

        // Photoshop masks use inverted colours compared to our Canvas masking
        //inverseMask( cvs );

        layerProps.mask = cvs;
    }

    // 3. retrieve layer source
    const composite = await layer.composite( false );
    const source = byteArrayToCanvas( composite, layerWidth, layerHeight );

    layers.push( LayerFactory.create({
        visible : !layer.isHidden,
        left    : layerX,
        top     : layerY,
        width   : layerWidth,
        height  : layerHeight,
        name,
        source,
        ...layerProps,
        filters : FiltersFactory.create({
            opacity   : ( layer.opacity ?? 255 ) / 255,
            blendMode : convertBlendMode( layer.layerFrame.layerProperties.blendMode )
        }),
    }));

    // layer bitmap parsing can be heavy, unblock CPU on each iteration
    await unblockedWaitUnlessFree();
}


function convertBlendMode( blendKey: string ): BlendModes {
    switch ( blendKey ) {
        // we don't support lbrn (linear burn), vLit (vivid light), lLit (linear light), pLit (pin light),
        // hMix (hard mix), pass (passthru), fsub (subtract) and fdiv (divide) blend modes
        default:
            return BlendModes.NORMAL;
        case "darken":
            return BlendModes.DARKEN;
        case "lite":
            return BlendModes.LIGHTEN;
        case "hue":
            return BlendModes.HUE;
        case "sat":
            return BlendModes.SATURATION;
        case "colr":
            return BlendModes.COLOR;
        case "lum":
            return BlendModes.LUMINOSITY;
        case "mul":
            return BlendModes.MULTIPLY;
        case "scrn":
            return BlendModes.SCREEN;
        case "over":
            return BlendModes.OVERLAY;
        case "hLit":
            return BlendModes.HARD_LIGHT;
        case "sLit":
            return BlendModes.SOFT_LIGHT;
        case "diff":
            return BlendModes.DIFFERENCE;
        case "smud":
            return BlendModes.EXCLUSION;
        case "div":
            return BlendModes.COLOR_DODGE;
        case "idiv":
            return BlendModes.COLOR_BURN;
        case "lddg":
            return BlendModes.LINEAR_DODGE;
        case "dkCl":
            return BlendModes.DARKER_COLOR;
        case "lgCl":
            return BlendModes.LIGHTER_COLOR;
    }
}
