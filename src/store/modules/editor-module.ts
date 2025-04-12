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
import type { Document, Filters } from "@/definitions/document";
import type {
    ZoomToolOptions, BrushToolOptions, EraserToolOptions, CloneToolOptions,
    SelectionToolOptions, FillToolOptions, WandToolOptions
} from "@/definitions/editor";
import ToolTypes, { TOOL_SRC_MERGED } from "@/definitions/tool-types";
import BrushTypes from "@/definitions/brush-types";
import { runRendererFn } from "@/factories/renderer-factory";

export interface EditorState {
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
    clonedFilters: Filters | null;
};

export const createEditorState = ( props?: Partial<EditorState> ): EditorState => ({
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
    clonedFilters: null,
    ...props,
});

const EditorModule: Module<EditorState, any> = {
    state: (): EditorState => createEditorState(),
    getters: {
        activeTool        : ( state: EditorState ): ToolTypes => state.activeTool,
        activeColor       : ( state: EditorState ): string => state.activeColor,
        clonedFilters     : ( state: EditorState ): Filters => state.clonedFilters,
        // @ts-expect-error Element implicitly has an 'any' type because expression of type 'ToolTypes' can't be used to index type
        activeToolOptions : ( state: EditorState ): any => state.options[ state.activeTool ],
        selectionOptions  : ( state: EditorState ): SelectionToolOptions => state.options[ ToolTypes.SELECTION ],
        zoomOptions       : ( state: EditorState ): ZoomToolOptions => state.options[ ToolTypes.ZOOM ],
        brushOptions      : ( state: EditorState ): BrushToolOptions => state.options[ ToolTypes.BRUSH ],
        eraserOptions     : ( state: EditorState ): EraserToolOptions => state.options[ ToolTypes.ERASER ],
        cloneOptions      : ( state: EditorState ): CloneToolOptions => state.options[ ToolTypes.CLONE ],
        fillOptions       : ( state: EditorState ): FillToolOptions => state.options[ ToolTypes.FILL ],
        wandOptions       : ( state: EditorState ): WandToolOptions => state.options[ ToolTypes.WAND ],
        snapAlign         : ( state: EditorState ): boolean => state.snapAlign,
        antiAlias         : ( state: EditorState ): boolean => state.antiAlias,
        pixelGrid         : ( state: EditorState ): boolean => state.pixelGrid,
    },
    mutations: {
        setActiveTool( state: EditorState, { tool, document }: { tool: ToolTypes, document: Document }): void {
            state.activeTool = tool;
            runRendererFn( renderer => {
                // @ts-expect-error Element implicitly has an 'any' type because expression of type 'ToolTypes' can't be used to index type
                renderer.handleActiveTool( tool, state.options[ state.activeTool ] as any, document );
            });
        },
        setActiveColor( state: EditorState, color: string ): void {
            state.activeColor = color;
            updateLayerRenderers( state.activeColor, state.options[ ToolTypes.BRUSH ] as BrushToolOptions );
        },
        setToolOptionValue( state: EditorState, { tool, option, value }: { tool: ToolTypes, option: string, value: any }): void {
            // @ts-expect-error Element implicitly has an 'any' type because expression of type 'ToolTypes' can't be used to index type
            const toolOptions: any = state.options[ tool ];
            toolOptions[ option ] = value;
            switch ( tool ) {
                default:
                    break;
                case ToolTypes.CLONE:
                case ToolTypes.BRUSH:
                    updateLayerRenderers( state.activeColor, toolOptions );
                    break;
                case ToolTypes.ERASER:
                    updateLayerRenderers( `rgba(255,255,255,${( toolOptions as EraserToolOptions ).opacity})`, toolOptions );
                    break;
            }
        },
        setSnapAlign( state: EditorState, enabled: boolean ): void {
            state.snapAlign = enabled;
        },
        setAntiAlias( state: EditorState, enabled: boolean ): void {
            state.antiAlias = enabled;
        },
        setPixelGrid( state: EditorState, enabled: boolean ): void {
            state.pixelGrid = enabled;
        },
        setClonedFilters( state: EditorState, filters: Filters | null ): void {
            state.clonedFilters = filters;
        },
    },
};
export default EditorModule;

/* internal methods */

function updateLayerRenderers( color: string, toolOptions: BrushToolOptions ): void {
    runRendererFn( renderer => {
        renderer.cacheBrush( color, toolOptions );
    });
}
