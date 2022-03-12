/**
 * @jest-environment jsdom
 */
import store from "@/store";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { LAYER_IMAGE, LAYER_TEXT } from "@/definitions/layer-types";
import LayerFactory from "@/factories/layer-factory";

const { getters, mutations, actions } = store;

let mockFontsConsented = true;
let mockFontConsentFn;
jest.mock( "@/services/font-service", () => ({
    fontsConsented: () => mockFontsConsented,
    consentFonts: () => mockFontConsentFn(),
    rejectFonts: jest.fn(),
}));
let mockUpdateFn;
jest.mock( "@/services/keyboard-service", () => ({
    setSuspended: (...args) => mockUpdateFn?.( "setSuspended", ...args ),
}));
jest.mock( "@/factories/document-factory", () => ({
    serialize: (...args) => mockUpdateFn?.( "serialize", ...args ),
    deserialize: (...args) => mockUpdateFn?.( "deserialize", ...args ),
    toBlob: (...args) => mockUpdateFn?.( "toBlob", ...args ),
    fromBlob: (...args) => mockUpdateFn?.( "fromBlob", ...args ),
}));
jest.mock( "@/utils/file-util", () => ({
    selectFile: (...args) => mockUpdateFn?.( "selectFile", ...args ),
    saveBlobAsFile: (...args) => mockUpdateFn?.( "saveBlobAsFile", ...args ),
}));
jest.mock("@/utils/canvas-util", () => ({
    createCanvas: jest.fn(),
    imageToBase64: jest.fn(),
    imageToCanvas: jest.fn(),
    base64ToLayerImage: jest.fn()
}));

describe( "Vuex store", () => {
    describe( "getters", () => {
        it( "should know when there is currently a loading state active", () => {
            const state = { loadingStates: [] };
            expect( getters.isLoading( state )).toBe( false );
            state.loadingStates.push( "foo" );
            expect( getters.isLoading( state )).toBe( true );
        });

        it( "should whether there is an active cloud storage connection", () => {
            let state = { dropboxConnected: false, driveConnected: false };
            expect( getters.hasCloudConnection( state )).toBe( false );

            state = { dropboxConnected: true, driveConnected: false };
            expect( getters.hasCloudConnection( state )).toBe( true );

            state = { dropboxConnected: false, driveConnected: true };
            expect( getters.hasCloudConnection( state )).toBe( true );
        });
    });

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

        describe( "when managing the opened panels", () => {
            it( "should be able to add individual panels to the opened panels list", () => {
                const state = { openedPanels: [ "foo" ] };
                mutations.setOpenedPanel( state, "bar" );
                expect( state.openedPanels ).toEqual([ "foo", "bar" ]);
            });

            it( "should be able to close individual panels in the opened panels list", () => {
                const state = { openedPanels: [ "foo", "bar" ] };
                mutations.setOpenedPanel( state, "foo" );
                expect( state.openedPanels ).toEqual([ "bar" ]);
            });

            it( "should be able to close all opened panels", () => {
                const state = { openedPanels: [ "foo", "bar" ] };
                mutations.closeOpenedPanels( state );
                expect( state.openedPanels ).toHaveLength( 0 );
            });
        });

        it( "should be able to set the current selection content", () => {
            const state = { selectionContent: null };
            const selection = { image: { src: "foo" }, size: { width: 100, height: 50 } };
            mutations.setSelectionContent( state, selection );
            expect( state.selectionContent ).toEqual( selection );
        });

        it( "should be able to toggle the active state of the blinding layer", () => {
            const state = { blindActive: false };
            mutations.setBlindActive( state, true );
            expect( state.blindActive ).toBe( true );
        });

        it( "should be able to set the global Document pan mode", () => {
            const state = { panMode: false };
            mutations.setPanMode( state, true );
            expect( state.panMode ).toBe( true );
        });

        describe( "when toggling loading states", () => {
            it( "should be able to register a new loading state", () => {
                const state = { loadingStates: [ "foo" ] };
                mutations.setLoading( state, "bar" );
                expect( state.loadingStates ).toEqual([ "foo", "bar" ]);
            });

            it( "should be able to unregister an existing loading state", () => {
                const state = { loadingStates: [ "foo", "bar" ] };
                mutations.unsetLoading( state, "foo" );
                expect( state.loadingStates ).toEqual([ "bar" ]);
            });
        });

        describe( "when toggling dialog windows", () => {
            it( "should be able to open a dialog window and apply its request parameters", () => {
                const state = { dialog: null };
                const params = {
                    type: "foo",
                    title: "title",
                    message: "message",
                    link: { href: "foo", title: "bar" },
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
                    link: null,
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

        it( "should be able to set the storage type", () => {
            const state = { storageType: "foo" };
            mutations.setStorageType( state, "bar" );
            expect( state.storageType ).toEqual( "bar" );
        });

        it( "should be able to set the Dropbox connection status", () => {
            const state = { dropboxConnected: false };
            mutations.setDropboxConnected( state, true );
            expect( state.dropboxConnected ).toEqual( true );
        });

        it( "should be able to set the Google Drive connection status", () => {
            const state = { driveConnected: false };
            mutations.setDriveConnected( state, true );
            expect( state.driveConnected ).toEqual( true );
        });
    });

    describe( "actions", () => {
        describe( "when loading a saved document", () => {
            it( "should be able to load a saved document by using the file selector", async () => {
                const commit = jest.fn();
                const mockFile = { name: "file" };
                const mockDocument = { name: "foo" };
                mockUpdateFn = jest.fn( fn => {
                    switch ( fn ) {
                        default:
                            return true;
                        case "selectFile":
                            return [mockFile];
                        case "fromBlob":
                            return mockDocument;
                    }
                });
                await actions.loadDocument({ commit });
                // assert file selector has been prompted
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "selectFile", expect.any( String ), expect.any( Boolean ));
                // assert selected file is converted from Blob to document
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "fromBlob", mockFile );
                // assert resulting Document has been added as the active document
                expect( commit ).toHaveBeenNthCalledWith( 1, "setLoading", "doc" );
                expect( commit ).toHaveBeenNthCalledWith( 2, "addNewDocument", mockDocument );
                expect( commit ).toHaveBeenNthCalledWith( 3, "showNotification", expect.any( Object ));
                expect( commit ).toHaveBeenNthCalledWith( 4, "unsetLoading", "doc" );
            });

            it( "should be able to load a saved document from a given File/Blob", async () => {
                const commit = jest.fn();
                const blob = { name: "file" };
                const mockDocument = { name: "foo" };
                mockUpdateFn = jest.fn( fn => {
                    switch ( fn ) {
                        default:
                            return true;
                        case "fromBlob":
                            return mockDocument;
                    }
                });
                await actions.loadDocument({ commit }, blob );
                // assert give file is converted from Blob to document
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "fromBlob", blob );
                // assert resulting Document has been added as the active document
                expect( commit ).toHaveBeenNthCalledWith( 1, "setLoading", "doc" );
                expect( commit ).toHaveBeenNthCalledWith( 2, "addNewDocument", mockDocument );
                expect( commit ).toHaveBeenNthCalledWith( 3, "showNotification", expect.any( Object ));
                expect( commit ).toHaveBeenNthCalledWith( 4, "unsetLoading", "doc" );
            });

            describe( "and the document has text layers", () => {
                it( "should request user consent for using Google Fonts, if none had been given yet", async () => {
                    const commit = jest.fn();
                    const blob = { name: "file" };
                    const mockDocument = { name: "foo", layers: [ LayerFactory.create({ type: LAYER_TEXT }) ] };

                    mockFontsConsented = false;
                    mockFontConsentFn = jest.fn();

                    mockUpdateFn = jest.fn( fn => {
                        switch ( fn ) {
                            default:
                                return true;
                            case "fromBlob":
                                return mockDocument;
                        }
                    });
                    await actions.loadDocument({ commit }, blob );
                    // assert confirmation dialog was spawned
                    expect( commit ).toHaveBeenNthCalledWith( 2, "openDialog", {
                        type: "confirm",
                        title: "fonts.consentRequired",
                        message: "fonts.consentExpl",
                        confirm: expect.any( Function ),
                        cancel: expect.any( Function )
                    });
                    // assert document opening was deferred
                    expect( commit ).not.toHaveBeenCalledWith( "addNewDocument" );
                    expect( mockFontConsentFn ).not.toHaveBeenCalled();

                    // assert document opens upon confirmation
                    const dialogArgs = commit.mock.calls[ 1 ][ 1 ];
                    dialogArgs.confirm();

                    expect( mockFontConsentFn ).toHaveBeenCalled();
                    expect( commit ).toHaveBeenCalledWith( "addNewDocument", mockDocument );
                });

                it( "should not request user consent for using Google Fonts, if it had previously been given", async () => {
                    const commit = jest.fn();
                    const blob = { name: "file" };
                    const mockDocument = { name: "foo", layers: [ LayerFactory.create({ type: LAYER_TEXT }) ] };
                    mockFontsConsented = true;
                    mockUpdateFn = jest.fn( fn => {
                        switch ( fn ) {
                            default:
                                return true;
                            case "fromBlob":
                                return mockDocument;
                        }
                    });
                    await actions.loadDocument({ commit }, blob );
                    // assert dialog was not shown
                    expect( commit ).not.toHaveBeenCalledWith( "openDialog" );
                    // and document was loaded immediately
                    expect( commit ).toHaveBeenCalledWith( "addNewDocument", mockDocument );
                });
            });
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
                    case "toBlob":
                        return mockSavedDocument;
                }
            });
            await actions.saveDocument({ commit, getters: mockedGetters }, "foo" );

            // assert the active document is serialized by DocumentFactory.toBlob
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "toBlob", mockedGetters.activeDocument );
            // assert the resulting Blob will be saved to a File
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "saveBlobAsFile", expect.any( Object ), `foo.${PROJECT_FILE_EXTENSION}` );
            expect( commit ).toHaveBeenCalledWith( "showNotification", expect.any( Object ));
        });

        it( "should be able to paste the current in-memory image selection at the center of the Document", async () => {
            const state = {
                selectionContent: { image: { src: "foo" }, size: { width: 40, height: 30 } },
            };
            const mockedGetters = { activeDocument: { width: 200, height: 150, layers: [] } };
            const commit   = jest.fn();
            const dispatch = jest.fn();
            await actions.pasteSelection({ state, getters: mockedGetters, commit, dispatch });
            expect( commit ).toHaveBeenCalledWith( "insertLayerAtIndex", { index: 0, layer: expect.any( Object ) });
            expect( dispatch ).toHaveBeenCalledWith( "clearSelection" );
        });
    });
});
