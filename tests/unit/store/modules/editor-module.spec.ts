import { it, describe, expect } from "vitest";
import { mockZCanvas } from "../../mocks";
import BrushTypes from "@/definitions/brush-types";
import ToolTypes, { TOOL_SRC_MERGED } from "@/definitions/tool-types";
import FiltersFactory from "@/factories/filters-factory";
import storeModule, { createEditorState } from "@/store/modules/editor-module";

const { getters, mutations } = storeModule;

mockZCanvas();

describe( "Vuex editor module", () => {
    const BASE_OPTIONS = {
        [ ToolTypes.ZOOM ]  : { level: 1 },
        [ ToolTypes.BRUSH ] : { size: 10, type: BrushTypes.LINE, opacity: 1, strokes: 1, thickness: .5 },
        [ ToolTypes.ERASER ]: { size: 10, type: BrushTypes.PAINT_BRUSH, opacity: 1, thickness: .5 },
        [ ToolTypes.CLONE ] : { size: 10, type: BrushTypes.PAINT_BRUSH, opacity: 1, thickness: .5, sourceLayerId: TOOL_SRC_MERGED, coords: { x: 10, y: 15 } },
        [ ToolTypes.SELECTION ] : { lockRatio: false, xRatio: 1, yRatio: 1 },
        [ ToolTypes.FILL ] : { smartFill: true },
        [ ToolTypes.WAND ] : { threshold: 15, sampleMerged: true },
    };

    describe( "getters", () => {
        const clonedFilters = FiltersFactory.create();
        const state = createEditorState({
            activeTool: ToolTypes.CLONE,
            activeColor: "red",
            options: { ...BASE_OPTIONS },
            snapAlign: true,
            antiAlias: true,
            pixelGrid: false,
            clonedFilters,
        });
        
        it( "should be able to return the active tool", () => {
            expect( getters.activeTool( state, getters, {}, {} )).toEqual( ToolTypes.CLONE );
        });

        it( "should be able to return the active tool options", () => {
            expect( getters.activeToolOptions( state, getters, {}, {} )).toEqual( state.options[ ToolTypes.CLONE ]);
        });

        it( "should be able to return the active color", () => {
            expect( getters.activeColor( state, getters, {}, {} )).toEqual( "red" );
        });

        it( "should be able to retrieve the selection options", () => {
            expect( getters.selectionOptions( state, getters, {}, {} )).toEqual( BASE_OPTIONS[ ToolTypes.SELECTION ]);
        });

        it( "should be able to retrieve the zoom options", () => {
            expect( getters.zoomOptions( state, getters, {}, {} )).toEqual( BASE_OPTIONS[ ToolTypes.ZOOM ]);
        });

        it( "should be able to retrieve the brush options", () => {
            expect( getters.brushOptions( state, getters, {}, {} )).toEqual( BASE_OPTIONS[ ToolTypes.BRUSH ]);
        });

        it( "should be able to retrieve the eraser options", () => {
            expect( getters.eraserOptions( state, getters, {}, {} )).toEqual( BASE_OPTIONS[ ToolTypes.ERASER ]);
        });

        it( "should be able to retrieve the clone stamp options", () => {
            expect( getters.cloneOptions( state, getters, {}, {} )).toEqual( BASE_OPTIONS[ ToolTypes.CLONE ]);
        });

        it( "should be able to retrieve the fill options", () => {
            expect( getters.fillOptions( state, getters, {}, {} )).toEqual( BASE_OPTIONS[ ToolTypes.FILL ]);
        });

        it( "should be able to retrieve the magic wand options", () => {
            expect( getters.wandOptions( state, getters, {}, {} )).toEqual( BASE_OPTIONS[ ToolTypes.WAND ]);
        });

        it( "should be able to retrieve the current snap and alignment state", () => {
            expect( getters.snapAlign( state, getters, {}, {} )).toBe( true );
        });

        it( "should be able to retrieve the current anti-aliasing state", () => {
            expect( getters.antiAlias( state, getters, {}, {} )).toBe( true );
        });

        it( "should be able to retrieve the copied filters", () => {
            expect( getters.clonedFilters( state, getters, {}, {} )).toEqual( clonedFilters );
        });
    });

    describe( "mutations", () => {
        const state = createEditorState({
            activeTool: ToolTypes.ZOOM,
            activeColor: "red",
            options: { ...BASE_OPTIONS },
            snapAlign: true,
            antiAlias: true,
            clonedFilters: null,
        });

        it( "should be able to set the active tool", () => {
            mutations.setActiveTool( state, { tool: ToolTypes.BRUSH });
            expect( state.activeTool ).toEqual( ToolTypes.BRUSH );
        });

        it( "should be able to set the active color", () => {
            mutations.setActiveColor( state, "blue" );
            expect( state.activeColor ).toEqual( "blue" );
        });

        it( "should be able to set individual tool option values", () => {
            mutations.setToolOptionValue( state, { tool: ToolTypes.ZOOM, option: "level", value: 10 });
            expect( state.options ).toEqual({
                ...BASE_OPTIONS,
                [ ToolTypes.ZOOM ]: { level: 10 },
            });
        });

        it( "should be able to set the snap and align state", () => {
            mutations.setSnapAlign( state, false );
            expect( state.snapAlign ).toBe( false );
        });

        it( "should be able to set the anti-aliasing state", () => {
            mutations.setAntiAlias( state, false );
            expect( state.antiAlias ).toBe( false );
        });

        it( "should be able to set the cloned filters", () => {
            const filters = FiltersFactory.create({ opacity: 0.5 });
            mutations.setClonedFilters( state, filters );
            expect( state.clonedFilters ).toEqual( filters );
        });
    });
});
