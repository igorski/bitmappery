import storeModule from "@/store/modules/canvas-module";

const { getters, mutations } = storeModule;

describe( "Vuex canvas module", () => {
    describe( "getters", () => {
        it( "should be able to retrieve the zCanvas instance base dimensions", () => {
            const state = { zCanvasBaseDimensions: { width: 10, height: 5 } };
            expect( getters.zCanvasBaseDimensions( state )).toEqual( state.zCanvasBaseDimensions );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the zCanvas instance base dimensions", () => {
            const state = { zCanvasBaseDimensions: { width: 10, height: 5 } };
            mutations.setZCanvasBaseDimensions( state, { width: 50, height: 40 } );
            expect( state.zCanvasBaseDimensions ).toEqual({ width: 50, height: 40 });
        });
    });
});
