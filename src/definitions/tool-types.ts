/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
import type { Document, Layer } from "@/definitions/document";
import { constrain, isPortrait } from "@/math/image-math";
import { MAX_IMAGE_SIZE, MAX_MEGAPIXEL, getMinImageSize } from "@/definitions/editor-properties";
import { LayerTypes } from "@/definitions/layer-types";
import { getPixelRatio } from "@/utils/canvas-util";

enum ToolTypes {
    MOVE       = "move",  // pans viewport
    DRAG       = "drag",  // drags layer within document
    LASSO      = "lasso",
    SELECTION  = "selection",
    WAND       = "wand",
    SCALE      = "scale",
    EYEDROPPER = "eyedropper",
    ROTATE     = "rotate",
    MIRROR     = "mirror",
    FILL       = "fill",
    BRUSH      = "brush",
    ERASER     = "eraser",
    CLONE      = "clone",
    TEXT       = "text",
    ZOOM       = "zoom",
};
export default ToolTypes;

// certain tools are handled by the top layer interaction pane, not individual layer renderers

export const PANE_TYPES = [ ToolTypes.MOVE, ToolTypes.LASSO, ToolTypes.SELECTION, ToolTypes.WAND, ToolTypes.ZOOM ];
export const usesInteractionPane = ( tool: ToolTypes ): boolean => PANE_TYPES.includes( tool );

export const SELECTION_TOOLS = [ ToolTypes.SELECTION, ToolTypes.LASSO, ToolTypes.WAND ];

export const canDraw = ( activeDocument: Document, activeLayer: Layer, activeLayerMask?: HTMLCanvasElement ): boolean => {
    return activeDocument &&
    (( !!activeLayer?.mask && activeLayer.mask === activeLayerMask ) || activeLayer?.type === LayerTypes.LAYER_GRAPHIC );
};

export const canDragMask = ( activeLayer?: Layer, activeLayerMask?: HTMLCanvasElement ): boolean => {
    if ( !activeLayer || !activeLayer?.mask || ( activeLayer.mask !== activeLayerMask )) {
        return false;
    }
    return activeLayer.transform.rotation === 0;
};

export const TOOL_SRC_MERGED = "Merged"; // constant to define that a tools source context are all layers merged

// UI variables
export const MAX_BRUSH_SIZE = 100;
export const MIN_ZOOM       = -50; // zooming out from base (which is 0)
export const MAX_ZOOM       = 50;  // zooming in from base (which is 0)
export const SNAP_MARGIN    = 20;  // amount of pixels within which we allow snapping to guides

/**
 * Ideally we'd like to zoom the document in and out by a fixed scale, however
 * if the max zoom exceeds the maximum image size, the magnification is scaled
 * down to a value that relates to this maximum image size. The returned in-magnification value
 * should lead to the maximum scale relative to the document size, making the max displayed
 * value equal across window sizes.
 */
export const calculateMaxScaling = ( baseWidth: number, baseHeight: number,
    docWidth: number, docHeight: number, containerWidth: number
): ScalingDef => {
    const pixelRatio = getPixelRatio(); // zCanvas magnifies for pixel ratio
    const portrait   = isPortrait( baseWidth, baseHeight );

    // dimensions of document at max displayable megapixel size
    const maxScale = portrait ? MAX_IMAGE_SIZE / baseHeight : MAX_IMAGE_SIZE / baseWidth;
    const { width } = constrain(
        baseWidth  * maxScale,
        baseHeight * maxScale,
        MAX_MEGAPIXEL
    );
    // whether the horizontal side is the dominant side (e.g. matches the container horizontal size)
    const horizontalDominant = baseWidth === containerWidth;
    const MIN_IMAGE_SIZE = getMinImageSize( docWidth, docHeight );

    return {
        horizontalDominant,
        maxInScale  : ( width / baseWidth ) / pixelRatio,
        maxOutScale : ( portrait ? baseHeight / MIN_IMAGE_SIZE : baseWidth / MIN_IMAGE_SIZE ) / pixelRatio
    };
};

type ScalingDef = {
    horizontalDominant: boolean;
    maxInScale: number;
    maxOutScale: number;
};
