import storeModule from "@/store/modules/preferences-module";

const { getters, mutations } = storeModule;

describe( "Vuex preferences module", () => {
    describe( "getters", () => {
        const state = {
            preferences: {
                foo: false,
                bar: true,
                baz: true,
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
                    foo: false,
                    bar: true,
                }
            };
            mutations.setPreferences( state, { foo: true, baz: false });
            expect( state.preferences ).toEqual({
                foo: true,
                bar: true,
                baz: false
            });
        });
    })
});
