import storeModule from "@/store/modules/preferences-module";

const { getters, mutations, actions } = storeModule;

let mockStorageData;
Storage.prototype.getItem = jest.fn(() => JSON.stringify( mockStorageData ));

describe( "Vuex preferences module", () => {
    describe( "getters", () => {
        const state = {
            preferences: {
                lowMemory   : false,
                wasmFilters : true,
                snapAlign   : true,
            }
        };

        it( "should be able to return all preferences", () => {
            expect( getters.preferences( state )).toEqual( state.preferences );
        });

        it( "should be able to return individual preferences through the curried getters", () => {
            expect( getters.getPreference( state )( "bar" )).toEqual( state.preferences.bar );
        });
    });

    describe( "mutations", () => {
        it( "should be able to add new/update values to the existing preferences", () => {
            const state = {
                preferences: {
                    lowMemory   : false,
                    wasmFilters : true,
                }
            };
            mutations.setPreferences( state, { lowMemory: true, snapAlign: false });
            expect( state.preferences ).toEqual({
                lowMemory   : true,
                wasmFilters : true,
                snapAlign   : false
            });
        });
    });

    describe( "actions", () => {
        it( "should be able to restore previously saved preferences", async () => {
            mockStorageData = {
                lowMemory   : false,
                wasmFilters : true,
                snapAlign   : true
            };
            const commit = jest.fn();
            await actions.restorePreferences({ commit });
            expect( commit ).toHaveBeenNthCalledWith( 1, "setPreferences", mockStorageData );
            expect( commit ).toHaveBeenNthCalledWith( 2, "setSnapAlign", mockStorageData.snapAlign );
        });
    });
});
