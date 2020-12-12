import storeModule from "@/store/modules/tool-module";

const { getters, mutations } = storeModule;

describe( "Vuex tool module", () => {
    describe( "getters", () => {
        it( "should be able to return the active tool", () => {
            const state = { activeTool: "foo" };
            expect( getters.activeTool( state )).toEqual( "foo" );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the active tool", () => {
            const state = { activeTool: "foo" };
            mutations.setActiveTool( state, "bar" );
            expect( state.activeTool ).toEqual( "bar" );
        });
    });
});
