import store from "@/store";

const { mutations } = store;

describe( "Vuex store", () => {
    describe( "mutations", () => {
        it("should be able to toggle the opened state of the menu", () => {
            const state = { menuOpened: false };
            mutations.setMenuOpened( state, true );
            expect( state.menuOpened ).toBe( true );
        });

        it("should be able to toggle the opened state of the toolbox", () => {
            const state = { toolboxOpened: false };
            mutations.setToolboxOpened( state, true );
            expect( state.toolboxOpened ).toBe( true );
        });

        it("should be able to toggle the opened state of the options panel", () => {
            const state = { optionsPanelOpened: false };
            mutations.setOptionsPanelOpened( state, true );
            expect( state.optionsPanelOpened ).toBe( true );
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

        describe( "when toggling the modal window", () => {
            it( "should be able to set the opened modal", () => {
                const state = { blindActive: false, modal: null };
                mutations.openModal(state, "foo");
                expect(state).toEqual({ blindActive: true, modal: "foo" });
            });

            it( "should be able to unset the opened modal", () => {
                const state = { blindActive: true, modal: "foo" };
                mutations.openModal(state, null);
                expect(state).toEqual({ blindActive: false, modal: null });
            });

            it( "should be able to close the currently opened modal, if existing", () => {
                const state = { blindActive: true, modal: "foo" };
                mutations.closeModal(state);
                expect(state).toEqual({ blindActive: false, modal: null });
            });
        });

        describe("when showing notification messages", () => {
            it("should be able to show a notification displaying its title and message", () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { title: "foo", message: "bar" });
                expect(state.notifications).toEqual([{ title: "foo", message: "bar" }]);
            });

            it("should be able to show a notification using a default title when none was specified", () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { message: "foo" });
                expect(state.notifications).toEqual([{ title: "title.success", message: "foo" }]);
            });

            it("should be able to queue multiple notifications", () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { message: "foo" });
                mutations.showNotification(state, { message: "bar" });
                expect(state.notifications).toEqual([
                    { title: "title.success", message: "foo" },
                    { title: "title.success", message: "bar" }
                ]);
            });

            it("should be able to clear all queued notifications", () => {
                const state = { notifications: [{ foo: "bar" }, { baz: "qux" }]};
                mutations.clearNotifications(state);
                expect(state.notifications).toEqual([]);
            });
        });

        it( "should be able to set the window size", () => {
            const state = { windowSize: { width: 0, height: 0 }};
            const width = 500;
            const height = 400;
            mutations.setWindowSize( state, { width, height });
            expect( state.windowSize ).toEqual({ width, height });
        });
    });
});
