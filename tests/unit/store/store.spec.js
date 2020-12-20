import store from "@/store";

const { mutations, actions } = store;

let mockUpdateFn;
jest.mock( "@/services/keyboard-service", () => ({
    setSuspended: (...args) => mockUpdateFn?.( "setSuspended", ...args ),
}));
jest.mock( "@/factories/document-factory", () => ({
    serialize: (...args) => mockUpdateFn?.( "serialize", ...args ),
    deserialize: (...args) => mockUpdateFn?.( "deserialize", ...args ),
}));
jest.mock( "@/utils/file-util", () => ({
    readFile: (...args) => mockUpdateFn?.( "readFile", ...args ),
    selectFile: (...args) => mockUpdateFn?.( "selectFile", ...args ),
    saveBlobAsFile: (...args) => mockUpdateFn?.( "saveBlobAsFile", ...args ),
}))
jest.mock( "lz-string", () => ({
    compressToUTF16: (...args) => mockUpdateFn?.( "compressToUTF16", ...args ),
    decompressFromUTF16: (...args) => mockUpdateFn?.( "decompressFromUTF16", ...args ),
}));

describe( "Vuex store", () => {
    describe( "mutations", () => {
        it( "should be able to toggle the opened state of the menu", () => {
            const state = { menuOpened: false };
            mutations.setMenuOpened( state, true );
            expect( state.menuOpened ).toBe( true );
        });

        it( "should be able to toggle the opened state of the toolbox", () => {
            const state = { toolboxOpened: false };
            mutations.setToolboxOpened( state, true );
            expect( state.toolboxOpened ).toBe( true );
        });

        it( "should be able to toggle the opened state of the options panel", () => {
            const state = { optionsPanelOpened: false };
            mutations.setOptionsPanelOpened( state, true );
            expect( state.optionsPanelOpened ).toBe( true );
        });

        it( "should be able to toggle the active state of the blinding layer", () => {
            const state = { blindActive: false };
            mutations.setBlindActive( state, true );
            expect( state.blindActive ).toBe( true );
        });

        describe( "when toggling dialog windows", () => {
            it( "should be able to open a dialog window and apply its request parameters", () => {
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

            it( "should be able to apply default values when opening a dialog window without parameters", () => {
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

            it( "should be able to close an open dialog window", () => {
                const state = { dialog: { type: "foo" } };
                mutations.closeDialog( state );
                expect( state.dialog ).toBeNull();
            });
        });

        describe( "when toggling the modal window", () => {
            it( "should be able to set the opened modal", () => {
                const state = { blindActive: false, modal: null };
                mutations.openModal( state, "foo" );
                expect( state ).toEqual({ blindActive: true, modal: "foo" });
            });

            it( "should be able to unset the opened modal", () => {
                const state = { blindActive: true, modal: "foo" };
                mutations.openModal( state, null );
                expect( state ).toEqual({ blindActive: false, modal: null });
            });

            it( "should be able to close the currently opened modal, if existing", () => {
                const state = { blindActive: true, modal: "foo" };
                mutations.closeModal( state );
                expect( state ).toEqual({ blindActive: false, modal: null });
            });

            it( "should suspend the keyboard service on open to not conflict with form inputs", () => {
                const state = { blindActive: false, modal: null };
                mockUpdateFn = jest.fn();
                mutations.openModal( state, "foo" );
                expect( mockUpdateFn ).toHaveBeenCalledWith( "setSuspended", true );
            });

            it( "should unsuspend the keyboard service on close", () => {
                const state = { blindActive: true, modal: "foo" };
                mockUpdateFn = jest.fn();
                mutations.closeModal( state );
                expect( mockUpdateFn ).toHaveBeenCalledWith( "setSuspended", false );
            });
        });

        describe( "when showing notification messages", () => {
            it( "should be able to show a notification displaying its title and message", () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { title: "foo", message: "bar" });
                expect(state.notifications).toEqual([{ title: "foo", message: "bar" }]);
            });

            it( "should be able to show a notification using a default title when none was specified", () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { message: "foo" });
                expect(state.notifications).toEqual([{ title: "title.success", message: "foo" }]);
            });

            it( "should be able to queue multiple notifications", () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { message: "foo" });
                mutations.showNotification(state, { message: "bar" });
                expect(state.notifications).toEqual([
                    { title: "title.success", message: "foo" },
                    { title: "title.success", message: "bar" }
                ]);
            });

            it( "should be able to clear all queued notifications", () => {
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

    describe( "actions", () => {
        it( "should be able to load a saved document", async () => {
            const commit = jest.fn();
            const mockFile = { name: "file" };
            const mockFileData = "base64";
            const mockDecompressed = "{\"base\":\"64\"}";
            const mockDocument = { name: "foo" };
            mockUpdateFn = jest.fn( fn => {
                switch ( fn ) {
                    default:
                        return true;
                    case "selectFile":
                        return [mockFile];
                    case "readFile":
                        return mockFileData;
                    case "decompressFromUTF16":
                        return mockDecompressed;
                    case "deserialize":
                        return mockDocument;
                }
            });
            await actions.loadDocument({ commit });
            // assert file selector has been prompted
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "selectFile", expect.any( String ), expect.any( Boolean ));
            // assert selected file is read
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "readFile", mockFile );
            // assert read data has been processed by decompressor
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "decompressFromUTF16", mockFileData );
            // assert decompressed data has been deserialized by DocumentFactory
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 4, "deserialize", JSON.parse( mockDecompressed ));
            // assert resulting Document has been added as the active document
            expect( commit ).toHaveBeenNthCalledWith( 1, "addNewDocument", mockDocument );
            expect( commit ).toHaveBeenNthCalledWith( 2, "showNotification", expect.any( Object ));
        });

        it( "should be able to save the currently opened document", async () => {
            const commit = jest.fn();
            const mockedGetters = {
                activeDocument: { name: "foo" },
            };
            const mockSavedDocument = { n: "foo" };
            mockUpdateFn = jest.fn( fn => {
                switch ( fn ) {
                    default:
                        return true;
                    case "serialize":
                        return mockSavedDocument;
                }
            });
            await actions.saveDocument({ commit, getters: mockedGetters }, "foo" );

            // assert the active document is serialized by DocumentFactory.serialize
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "serialize", mockedGetters.activeDocument );
            // assert the DocumentFactory saved result is stringified and compressed
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "compressToUTF16", JSON.stringify( mockSavedDocument ));
            // assert the resulting Blob will be saved to a File
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "saveBlobAsFile", expect.any( Object ), "foo.pmp" );
            expect( commit ).toHaveBeenCalledWith( "showNotification", expect.any( Object ));
        });
    });
});
