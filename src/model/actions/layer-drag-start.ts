/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
import ToolTypes from "@/definitions/tool-types";
import { type Layer } from "@/model/types/layer";
import { enqueueState } from "@/model/factories/history-state-factory";
import LayerFactory from "@/model/factories/layer-factory";
import { getRendererForLayer } from "@/model/factories/renderer-factory";
import { getCanvasInstance } from "@/services/canvas-service";
import { type BitMapperyState } from "@/store";
import { cloneCanvas } from "@/utils/canvas-util";
import { copySelection, deleteSelectionContent } from "@/utils/document-util";
import { replaceLayerSource } from "@/utils/layer-util";
import { clone } from "@/utils/object-util";
import { selectionToRectangle } from "@/utils/selection-util";

export async function startLayerDrag( store: Store<BitMapperyState>, layer: Layer, x: number, y: number ): Promise<void> {
    const { activeDocument, activeLayerMask, activeTool, hasSelection } = store.getters;

    const renderer = getRendererForLayer( layer );

    if ( renderer ) {
        getCanvasInstance().draggingSprite = renderer;
    }

    if ( activeTool === ToolTypes.DRAG && hasSelection ) {
        console.info( "DRAGGING A SELECTION!!");

        const hasMask = !!layer.mask && activeLayerMask === layer.mask;
        const orgContent = cloneCanvas( hasMask ? layer.mask : layer.source );
        const orgSelection = clone( activeDocument.activeSelection );
        const selectionContent = await copySelection( activeDocument, layer )
        const bitmapWithoutSelection = deleteSelectionContent( activeDocument, layer );

        const selectionBitmap = selectionContent.content.bitmap;
        const selectionBoundingBox = selectionToRectangle( activeDocument.activeSelection );
        const newLayer = LayerFactory.create({
            left: x - selectionBoundingBox.width / 2,
            top: y - selectionBoundingBox.height / 2,
            width: selectionBitmap.width,
            height: selectionBitmap.height,
            source: selectionBitmap,
        });
        const insertIndex = activeDocument.layers.indexOf( layer ) + 1;

        const replaceSource = ( newSource: HTMLCanvasElement ): void => {
            replaceLayerSource( layer, newSource, hasMask );
            renderer?.resetFilterAndRecache();
        };

        const commit = () => {
            replaceSource( bitmapWithoutSelection );
            store.commit( "insertLayerAtIndex", { index: insertIndex, layer: newLayer });
                
            queueMicrotask(() => {
                store.commit( "setActiveSelection", [] );
                renderer.handleInteraction( x, y, { type: "mouseup" });
            
                const renderer2 = getRendererForLayer( newLayer );
                renderer2.setInteractive( true );
                renderer2.handleInteraction( x, y, { type: "mousedown" });
            });
        };
        commit();

        enqueueState( `startLayerDrag_${layer.id}`, {
            undo(): void {
                replaceSource( orgContent );
                store.commit( "removeLayer", insertIndex );

                queueMicrotask(() => {
                    getRendererForLayer( layer )?.handleInteraction( x, y, { type: "mouseup" });
                    store.commit( "setActiveSelection", orgSelection );
                });
            },
            redo: commit,
        });
    }
}
