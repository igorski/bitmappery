/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022-2026 - https://www.igorski.nl
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
import { BlendModes } from "@/definitions/blend-modes";
import type { RGBA } from "@/definitions/colors";
import type { Document, Layer } from "@/definitions/document";
import { googleFonts } from "@/definitions/font-types";
import { LayerTypes } from "@/definitions/layer-types";
import DocumentFactory from "@/factories/document-factory";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory, { type LayerProps } from "@/factories/layer-factory";
import type { TextProps } from "@/factories/text-factory";
import { inverseMask } from "@/rendering/operations/compositing";
import { createCanvas, base64toCanvas } from "@/utils/canvas-util";
import { RGBAtoHex } from "@/utils/color-util";
import { SmartExecutor } from "@/utils/debounce-util";

type PSDLayer = Rectangle & {
    mask: Rectangle;
    opacity: number;
    visible: boolean;
    blendMode: {
        blendKey: string;
    },
    image: {
        hasMask: boolean;
        width: () => number;
        height: () => number;
        toBase64: () => string;
        maskData: {
            buffer: ArrayBuffer;
        }
    },
    typeTool?: () => PSDTextData;
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

type PSDTextData = {
    textValue: string;
    colors: () => RGBA[];
    fonts: () => string[];
    sizes: () => number[];
};

type PSD = {
    tree: () => Size & PSDNode;
    image: {
        toPng: () => HTMLImageElement;
    },
};

export const importPSD = async ( psdFileReference: File ): Promise<Document> => {
    try {
        const smartExec = new SmartExecutor(); // parsing nested PSD content can get heavy on CPU resources
        const psd = await PSD.fromDroppedFile( psdFileReference );
        await smartExec.waitWhenBusy();
        const doc = await psdToBitMapperyDocument( smartExec, psd, psdFileReference );
        return doc;
    } catch ( error ) {
        console.error( error );
        return null;
    }
};

/* internal methods */

async function psdToBitMapperyDocument( smartExec: SmartExecutor, psd: any, psdFileReference: File ): Promise<Document> {
    const psdTree = psd.tree();
    const { width, height } = psdTree;

    // collect layers
    const layers: Layer[] = [];

    for ( const layerObj of psdTree.children().reverse() ) {
        const { layer } = layerObj;

        // when there are children, this is likely a group layer
        const children = layer.node?.children() ?? [];

        if ( children.length ) {
            for ( const childLayer of children.reverse() ) {
                await createLayer( childLayer.layer, layers, childLayer.name );
                await smartExec.waitWhenBusy();
            }
        } else {
            try {
                await createLayer( layer, layers, layerObj.name );
            } catch ( e: any ) {
                console.error( `Error occured while importing layer "${layerObj.name}".`, e );
            }
        }
        await smartExec.waitWhenBusy();
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

    const layerProps: LayerProps = {
        type: LayerTypes.LAYER_GRAPHIC,
    };

    // determine whether layer uses masking

    if ( layer.image.hasMask && layer.mask.width ) {
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

    // retrieve layer contents

    const isText = typeof layer.typeTool === "function";
    if ( isText ) {
        const textData = layer.typeTool!();

        layerProps.type = LayerTypes.LAYER_TEXT;
        layerProps.text = {
            value: textData.textValue,
            color: RGBAtoHex( textData.colors()?.[ 0 ] ?? [ 0, 0, 0, 0 ]),
            font: textData.fonts()?.find( font => googleFonts.includes( font )),
            size : textData.sizes()?.[0],
            unit: "px",
        } as TextProps;
    } else {
        layerProps.source = layer.image ? await base64toCanvas( layer.image.toBase64(), layer.image.width(), layer.image.height() ) : null;
    }

    layers.push( LayerFactory.create({
        visible : layer.visible,
        left    : layerX,
        top     : layerY,
        width   : layerWidth,
        height  : layerHeight,
        name,
        ...layerProps,
        filters : FiltersFactory.create({
            opacity   : ( layer.opacity ?? 255 ) / 255,
            blendMode : convertBlendMode( layer.blendMode.blendKey )
        }),
    }));
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
