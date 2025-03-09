/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
import type { Module } from "vuex";
import type { Document } from "@/definitions/document";
import type {
    ZoomToolOptions, BrushToolOptions, EraserToolOptions, CloneToolOptions,
    SelectionToolOptions, FillToolOptions, WandToolOptions
} from "@/definitions/editor";
import ToolTypes, { TOOL_SRC_MERGED } from "@/definitions/tool-types";
import BrushTypes from "@/definitions/brush-types";
import { runSpriteFn } from "@/factories/sprite-factory";

export interface ToolState {
    activeTool: ToolTypes;
    activeColor: string;
    options: {
        [ ToolTypes.ZOOM ]  : ZoomToolOptions;
        [ ToolTypes.BRUSH ] : BrushToolOptions;
        [ ToolTypes.ERASER ]: EraserToolOptions;
        [ ToolTypes.CLONE ] : CloneToolOptions;
        [ ToolTypes.SELECTION ] : SelectionToolOptions;
        [ ToolTypes.FILL ] : FillToolOptions;
        [ ToolTypes.WAND ] : WandToolOptions;
    },
    snapAlign: boolean;
    antiAlias: boolean;
    pixelGrid: boolean;
};

export const createToolState = ( props?: Partial<ToolState> ): ToolState => ({
    activeTool  : null,
    activeColor : "rgba(255,0,0,1)",
    options : {
        [ ToolTypes.ZOOM ]  : { level: 1 },
        [ ToolTypes.BRUSH ] : { size: 10, type: BrushTypes.LINE, opacity: 1, strokes: 1, thickness: .5 },
        [ ToolTypes.ERASER ]: { size: 10, type: BrushTypes.PAINT_BRUSH, opacity: 1, thickness: .5 },
        [ ToolTypes.CLONE ] : { size: 10, type: BrushTypes.PAINT_BRUSH, opacity: .75, thickness: .5, sourceLayerId: TOOL_SRC_MERGED, coords: null },
        [ ToolTypes.SELECTION ] : { lockRatio: false, xRatio: 1, yRatio: 1 },
        [ ToolTypes.FILL ] : { smartFill: true },
        [ ToolTypes.WAND ] : { threshold: 50, sampleMerged: true },
    },
    snapAlign : true,
    antiAlias : true,
    pixelGrid : false,
    ...props,
});

const ToolModule: Module<ToolState, any> = {
    state: (): ToolState => createToolState(),
    getters: {
        activeTool        : ( state: ToolState ): ToolTypes => state.activeTool,
        activeColor       : ( state: ToolState ): string => state.activeColor,
        // @ts-expect-error Element implicitly has an 'any' type because expression of type 'ToolTypes' can't be used to index type
        activeToolOptions : ( state: ToolState ): any => state.options[ state.activeTool ],
        selectionOptions  : ( state: ToolState ): SelectionToolOptions => state.options[ ToolTypes.SELECTION ],
        zoomOptions       : ( state: ToolState ): ZoomToolOptions => state.options[ ToolTypes.ZOOM ],
        brushOptions      : ( state: ToolState ): BrushToolOptions => state.options[ ToolTypes.BRUSH ],
        eraserOptions     : ( state: ToolState ): EraserToolOptions => state.options[ ToolTypes.ERASER ],
        cloneOptions      : ( state: ToolState ): CloneToolOptions => state.options[ ToolTypes.CLONE ],
        fillOptions       : ( state: ToolState ): FillToolOptions => state.options[ ToolTypes.FILL ],
        wandOptions       : ( state: ToolState ): WandToolOptions => state.options[ ToolTypes.WAND ],
        snapAlign         : ( state: ToolState ): boolean => state.snapAlign,
        antiAlias         : ( state: ToolState ): boolean => state.antiAlias,
        pixelGrid         : ( state: ToolState ): boolean => state.pixelGrid,
    },
    mutations: {
        setActiveTool( state: ToolState, { tool, document }: { tool: ToolTypes, document: Document }): void {
            state.activeTool = tool;
            runSpriteFn( sprite => {
                // @ts-expect-error Element implicitly has an 'any' type because expression of type 'ToolTypes' can't be used to index type
                sprite.handleActiveTool( tool, state.options[ state.activeTool ] as any, document );
            });
        },
        setActiveColor( state: ToolState, color: string ): void {
            state.activeColor = color;
            updateLayerSprites( state.activeColor, state.options[ ToolTypes.BRUSH ] as BrushToolOptions );
        },
        setToolOptionValue( state: ToolState, { tool, option, value }: { tool: ToolTypes, option: string, value: any }): void {
            // @ts-expect-error Element implicitly has an 'any' type because expression of type 'ToolTypes' can't be used to index type
            const toolOptions: any = state.options[ tool ];
            toolOptions[ option ] = value;
            switch ( tool ) {
                default:
                    break;
                case ToolTypes.CLONE:
                case ToolTypes.BRUSH:
                    updateLayerSprites( state.activeColor, toolOptions );
                    break;
                case ToolTypes.ERASER:
                    updateLayerSprites( `rgba(255,255,255,${( toolOptions as EraserToolOptions ).opacity})`, toolOptions );
                    break;
            }
        },
        setSnapAlign( state: ToolState, enabled: boolean ): void {
            state.snapAlign = enabled;
        },
        setAntiAlias( state: ToolState, enabled: boolean ): void {
            state.antiAlias = enabled;
        },
        setPixelGrid( state: ToolState, enabled: boolean ): void {
            state.pixelGrid = enabled;
        },
    },
};
export default ToolModule;

/* internal methods */

function updateLayerSprites( color: string, toolOptions: BrushToolOptions ): void {
    runSpriteFn( sprite => {
        if ( sprite.isDrawable() ) {
            sprite.cacheBrush( color, toolOptions );
        }
    });
}
