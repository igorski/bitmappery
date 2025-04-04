/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2025 - https://www.igorski.nl
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
// @ts-expect-error TS7016 no type definitions for lodash.clonedeep
import cloneDeep from "lodash.clonedeep";
import type { Store } from "vuex";
import { BlendModes } from "@/definitions/blend-modes";
import type { Document, Layer } from "@/definitions/document";
import ToolTypes from "@/definitions/tool-types";
import TransformFactory from "@/factories/transform-factory";
import FiltersFactory from "@/factories/filters-factory";
import { enqueueState } from "@/factories/history-state-factory";
import type { BitMapperyState } from "@/store";
import { cloneCanvas, cloneResized } from "@/utils/canvas-util";
import { createLayerSnapshot } from "@/utils/document-util";

export const commitLayerEffectsAndTransforms = async (
    store: Store<BitMapperyState>, document: Document, layer: Layer, layerIndex: number
): Promise<void> => {
    const orgSource = cloneCanvas( layer.source );
    const orgMask = layer.mask ? cloneCanvas( layer.mask ) : undefined;
    const orgTransform = cloneDeep( layer.transform );
    const orgFilters = cloneDeep( layer.filters );
    
    const blendMode = ( layerIndex > 0 && layer.filters.enabled && layer.filters.blendMode !== BlendModes.NORMAL ) ? layer.filters.blendMode : BlendModes.NORMAL;
    
    const orgBounds = {
        left: layer.left,
        top: layer.top,
        width: layer.width,
        height: layer.height,
        maskX: layer.maskX,
        maskY: layer.maskY
    };
    const snapshot  = await createLayerSnapshot( layer, document );
    const newSource = cloneResized( snapshot, document.width, document.height );
    
    const commit = () => {
        store.commit( "updateLayer", { index: layerIndex, opts: {
            filters: FiltersFactory.create({ blendMode }),
            transform: TransformFactory.create(),
            source: newSource,
            mask: null,
            left: 0,
            top: 0,
            width: newSource.width,
            height: newSource.height,
            maskX: 0,
            maskY: 0,
        }, recreateRenderer: true });

        if ( store.getters.activeTool === ToolTypes.DRAG ) {
            store.commit( "setActiveTool", { tool: ToolTypes.DRAG });
        }
    };
    commit();

    enqueueState( `commit_layer_fx_${layerIndex}`, {
        undo() {
            store.commit( "updateLayer", {
                index: layerIndex,
                opts: {
                    filters: { ...orgFilters },
                    transform: { ...orgTransform },
                    source: orgSource,
                    mask: orgMask,
                    ...orgBounds,
                }, recreateRenderer: true
            });
            if ( store.getters.activeTool === ToolTypes.DRAG ) {
                store.commit( "setActiveTool", { tool: ToolTypes.DRAG });
            }
        },
        redo: commit
    });
};