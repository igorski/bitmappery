import storeModule from "@/store/modules/canvas-module";

const { getters, mutations } = storeModule;

describe( "Vuex canvas module", () => {
    describe( "getters", () => {
        it( "should be able to retrieve the zCanvas instance dimensions", () => {
            const state = {
                canvasDimensions: {
                    width: 10, height: 5, widthDominant: false,
                    visibleWidth: 7, visibleHeight: 3, maxInScale: 1, maxOutScale: 1
                }
            };
            expect( getters.canvasDimensions( state )).toEqual( state.canvasDimensions );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the zCanvas instance dimensions", () => {
            const state = {
                canvasDimensions: {
                    width: 10, height: 5, widthDominant: false,
                    visibleWidth: 7, visibleHeight: 3, maxInScale: 1, maxOutScale: 1
                }
            };
            mutations.setCanvasDimensions( state, {
                width: 50, height: 40, widthDominant: true,
                visibleWidth: 40, visibleHeight: 20, maxInScale: 5, maxOutScale: 10
            });
            expect( state.canvasDimensions ).toEqual({
                width: 50, height: 40, widthDominant: true,
                visibleWidth: 40, visibleHeight: 20, maxInScale: 5, maxOutScale: 10
            });
        });
    });
});
