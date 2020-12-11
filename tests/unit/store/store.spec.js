import store from "@/store";

const { mutations } = store;

describe( "Vuex store", () => {
    describe( "mutations", () => {
        it("should be able to toggle the opened state of the menu", () => {
            const state = { menuOpened: false };
            mutations.setMenuOpened( state, true );
            expect( state.menuOpened ).toBe( true );
        });

        it("should be able to toggle the active state of the blinding layer", () => {
            const state = { blindActive: false };
            mutations.setBlindActive( state, true );
            expect( state.blindActive ).toBe( true );
        });

        describe( "when toggling dialog windows", () => {
            it("should be able to open a dialog window and apply its request parameters", () => {
                const state = { dialog: null };
                const params = {
                    type: "foo",
                    title: "title",
                    message: "message",
                    confirm: jest.fn(),
                    cancel: jest.fn()
                };
                mutations.openDialog( state, params );
                expect( state.dialog ).toEqual( params );
            });

            it("should be able to apply default values when opening a dialog window without parameters", () => {
                const state = { dialog: null };
                mutations.openDialog( state, {} );
                expect( state.dialog ).toEqual({
                    type: "info",
                    title: "",
                    message: "",
                    confirm: null,
                    cancel: null
                });
            });

            it("should be able to close an open dialog window", () => {
                const state = { dialog: { type: "foo" } };
                mutations.closeDialog( state );
                expect( state.dialog ).toBeNull();
            });
        });
    });
});
