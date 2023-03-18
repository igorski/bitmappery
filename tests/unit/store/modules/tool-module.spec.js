import { it, describe, expect, vi } from "vitest";
import { mockZCanvas } from "../../__mocks";
import storeModule from "@/store/modules/tool-module";
import ToolTypes from "@/definitions/tool-types";

const { getters, mutations } = storeModule;

mockZCanvas();

describe( "Vuex tool module", () => {
    describe( "getters", () => {
        const state = {
            activeTool: ToolTypes.ZOOM,
            activeColor: "red",
            options: {
                [ ToolTypes.ZOOM ]      : { level: 1 },
                [ ToolTypes.BRUSH ]     : { size: 10 },
                [ ToolTypes.ERASER ]    : { size: 10, opacity: 1 },
                [ ToolTypes.CLONE ]     : { size: 10, opacity: 1, source: null, coords: null },
                [ ToolTypes.SELECTION ] : { lockRatio: false, xRatio: 1, yRatio: 1 },
                [ ToolTypes.FILL ]      : { smartFill: true },
                [ ToolTypes.WAND ]      : { threshold: 15, sampleMerged: true }
            },
            snapAlign: true,
            antiAlias: true,
        }
        it( "should be able to return the active tool", () => {
            expect( getters.activeTool( state )).toEqual( ToolTypes.ZOOM );
        });

        it( "should be able to return the active tool options", () => {
            expect( getters.activeToolOptions( state )).toEqual( state.options[ ToolTypes.ZOOM ]);
        });

        it( "should be able to return the active color", () => {
            expect( getters.activeColor( state )).toEqual( "red" );
        });

        it( "should be able to retrieve the selection options", () => {
            expect( getters.selectionOptions( state )).toEqual({ lockRatio: false, xRatio: 1, yRatio: 1 });
        });

        it( "should be able to retrieve the zoom options", () => {
            expect( getters.zoomOptions( state )).toEqual({ level: 1 });
        });

        it( "should be able to retrieve the brush options", () => {
            expect( getters.brushOptions( state )).toEqual({ size: 10 });
        });

        it( "should be able to retrieve the eraser options", () => {
            expect( getters.eraserOptions( state )).toEqual({ size: 10, opacity: 1 });
        });

        it( "should be able to retrieve the clone stamp options", () => {
            expect( getters.cloneOptions( state )).toEqual({ size: 10, opacity: 1, source: null, coords: null });
        });

        it( "should be able to retrieve the fill options", () => {
            expect( getters.fillOptions( state )).toEqual({ smartFill: true });
        });

        it( "should be able to retrieve the magic wand options", () => {
            expect( getters.wandOptions( state )).toEqual({ threshold: 15, sampleMerged: true });
        });

        it( "should be able to retrieve the current snap and alignment state", () => {
            expect( getters.snapAlign ( state )).toBe( true );
        });

        it( "should be able to retrieve the current anti-aliasing state", () => {
            expect( getters.antiAlias ( state )).toBe( true );
        });
    });

    describe( "mutations", () => {
        const state = {
            activeTool: "foo",
            activeColor: "red",
            options: {
                [ ToolTypes.ZOOM ]: { level: 1 },
                [ ToolTypes.BRUSH ]: { size: 10 },
            },
            snapAlign: true,
            antiAlias: true,
        };

        it( "should be able to set the active tool", () => {
            mutations.setActiveTool( state, { tool: "bar" });
            expect( state.activeTool ).toEqual( "bar" );
        });

        it( "should be able to set the active color", () => {
            mutations.setActiveColor( state, "blue" );
            expect( state.activeColor ).toEqual( "blue" );
        });

        it( "should be able to set individual tool option values", () => {
            mutations.setToolOptionValue( state, { tool: ToolTypes.ZOOM, option: "level", value: 10 });
            expect( state.options ).toEqual({
                [ ToolTypes.ZOOM ]: { level: 10 },
                [ ToolTypes.BRUSH ]: { size: 10 }
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
    });
});
