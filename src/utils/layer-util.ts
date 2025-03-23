/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
import { type Store } from "vuex";
import { type Rectangle } from "zcanvas";
import { BlendModes } from "@/definitions/blend-modes";
import { type Layer } from "@/definitions/document";
import { LayerTypes } from "@/definitions/layer-types";
import { enqueueState } from "@/factories/history-state-factory";
import { type BitMapperyState } from "@/store";
import { resizeImage } from "@/utils/canvas-util";

/**
 * Replace the source / mask contents of given layer, updating its
 * bounding box to be centered in relation to its previous size.
 *
 * @param {Layer} layer
 * @param {HTMLCanvasElement} newSource
 * @param {boolean=} isMask whether we're replacing the mask instead of source
 */
export const replaceLayerSource = ( layer: Layer, newSource: HTMLCanvasElement, isMask = false ): void => {
    const xDelta = ( layer.width  - newSource.width  ) / 2;
    const yDelta = ( layer.height - newSource.height ) / 2;

    if ( isMask ) {
        layer.mask   = newSource;
        layer.maskX += xDelta;
        layer.maskY += yDelta;
    } else {
        layer.source = newSource;
        layer.left  += xDelta;
        layer.top   += yDelta;
        layer.width  = newSource.width;
        layer.height = newSource.height;
    }
};

export const resizeLayerContent = async ( layer: Layer, ratioX: number, ratioY: number ): Promise<void> => {
    const { source, mask } = layer;

    layer.source = await resizeImage( source, source.width * ratioX, source.height * ratioY );
    if ( mask ) {
        layer.mask = await resizeImage( mask, mask.width * ratioX, mask.height * ratioY );
        layer.maskX *= ratioX;
        layer.maskY *= ratioY;
    }
    layer.left   *= ratioX;
    layer.top    *= ratioY;
    layer.width  *= ratioX;
    layer.height *= ratioY;

    if ( layer.type === LayerTypes.LAYER_TEXT ) {
        const { text } = layer;

        text.size       *= ratioX;
        text.spacing    *= ratioX;
        text.lineHeight *= ratioY;
    }
};

export const cropLayerContent = async ( layer: Layer, cropRectangle: Rectangle ): Promise<void> => {
    const { left, top, width, height } = cropRectangle;
   
    // we crop non-text layers that are not offset nor transformed
    const isOffset = layer.left !== 0 || layer.top !== 0;
    const isLargerThanCrop = layer.width > width && layer.height > height;
    const replaceSource = layer.type !== LayerTypes.LAYER_TEXT && !hasTransform( layer ) && !isOffset && isLargerThanCrop;

    if ( replaceSource ) {
        layer.source = await resizeImage( layer.source, width, height, left, top, width, height );
        if ( layer.mask ) {
            layer.mask = await resizeImage( layer.mask, width, height, left, top, width, height );
        }
    } else {
        layer.left -= left;
        layer.top  -= top;
    }
};

/**
 * Text layer addition can be initiated directly from the toolbox
 * or keyboard shortcut. Here we define a resuable history enqueue
 */
export const addTextLayer = ({ getters, commit }: Store<BitMapperyState> ): void => {
    const fn = () => commit( "addLayer", { type: LayerTypes.LAYER_TEXT });
    fn();
    const addedLayerIndex = getters.activeLayerIndex;
    enqueueState( `layerAdd_${addedLayerIndex}`, {
        undo() {
            commit( "removeLayer", addedLayerIndex );
        },
        redo: fn,
    });
};

export const isRotated = ( layer: Layer ): boolean => ( layer.effects.rotation % 360 ) !== 0;

export const isScaled = ( layer: Layer ): boolean => layer.effects.scale !== 1;

export const isMirrored = ( layer: Layer ): boolean => layer.effects.mirrorX || layer.effects.mirrorY;

export const hasTransform = ( layer: Layer ): boolean => isRotated( layer ) || isScaled( layer ) || isMirrored( layer );

/**
 * Whether provided layer has a blending filter
 */
export const hasBlend = ( layer: Layer ): boolean => {
    const { enabled, blendMode } = layer.filters;
    return enabled && blendMode !== BlendModes.NORMAL;
};

export const isDrawable = ( layer: Layer, store: Store<BitMapperyState> ): boolean => {
    return layer.type === LayerTypes.LAYER_GRAPHIC || isMaskable( layer, store );
};

export const isMaskable = ( layer: Layer, store: Store<BitMapperyState> ): boolean => {
    return !!layer.mask && store.getters.activeLayerMask === layer.mask;
};
