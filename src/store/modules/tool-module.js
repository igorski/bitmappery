/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
import Vue from "vue";
import ToolTypes, { TOOL_SRC_MERGED } from "@/definitions/tool-types";
import BrushTypes from "@/definitions/brush-types";
import { runSpriteFn } from "@/factories/sprite-factory";

export default {
    state: {
        activeTool: null,
        activeColor: "rgba(255,0,0,1)",
        options: {
            // see tool-option-zoom.vue
            [ ToolTypes.ZOOM ]  : { level: 1 },
            // see tool-options-brush.vue
            [ ToolTypes.BRUSH ] : { size: 10, type: BrushTypes.LINE, strokes: 1, thickness: .5 },
            // see tool-options-eraser.vue
            [ ToolTypes.ERASER ]: { size: 10, type: BrushTypes.PAINT_BRUSH, opacity: 1, thickness: .5 },
            // see tool-options-clone.vue
            [ ToolTypes.CLONE ] : { size: 10, type: BrushTypes.PAINT_BRUSH, opacity: .5, thickness: .5, sourceLayerId: TOOL_SRC_MERGED, coords: null },
            // see tool-options-selection
            [ ToolTypes.SELECTION ] : { lockRatio: false, xRatio: 1, yRatio: 1 },
        },
    },
    getters: {
        activeTool        : state => state.activeTool,
        activeColor       : state => state.activeColor,
        activeToolOptions : state => state.options[ state.activeTool ],
        selectionOptions  : state => state.options[ ToolTypes.SELECTION ],
        zoomOptions       : state => state.options[ ToolTypes.ZOOM ],
        brushOptions      : state => state.options[ ToolTypes.BRUSH ],
        eraserOptions     : state => state.options[ ToolTypes.ERASER ],
        cloneOptions      : state => state.options[ ToolTypes.CLONE ],
    },
    mutations: {
        setActiveTool( state, { tool, document }) {
            state.activeTool = tool;
            runSpriteFn( sprite => sprite.handleActiveTool( tool, state.options[ state.activeTool ], document ));
        },
        setActiveColor( state, color ) {
            state.activeColor = color;
            updateLayerSprites( state.activeColor, state.options[ ToolTypes.BRUSH ]);
        },
        setToolOptionValue( state, { tool, option, value }) {
            const toolOptions = state.options[ tool ];
            Vue.set( toolOptions, option, value );
            switch ( tool ) {
                default:
                    break;
                case ToolTypes.CLONE:
                case ToolTypes.BRUSH:
                    updateLayerSprites( state.activeColor, toolOptions );
                    break;
                case ToolTypes.ERASER:
                    updateLayerSprites( `rgba(255,255,255,${toolOptions.opacity})`, toolOptions );
                    break;
            }
        },
    },
};

function updateLayerSprites( color, toolOptions ) {
    runSpriteFn( sprite => {
        if ( sprite.isDrawable() ) {
            sprite.cacheBrush( color, toolOptions );
        }
    });
}
