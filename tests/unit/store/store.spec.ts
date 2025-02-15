import { it, describe, expect, afterAll, vi } from "vitest";
import { mockZCanvas } from "../mocks";
import { type Layer } from "@/definitions/document";
import { type Dialog } from "@/definitions/editor";
import { SAVE_DOCUMENT } from "@/definitions/modal-windows";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { LayerTypes } from "@/definitions/layer-types";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import KeyboardService from "@/services/keyboard-service";
import store from "@/store";
import { createState, createMockImageElement } from "../mocks";

const { getters, mutations, actions } = store;

let mockFontsConsented = true;
let mockFontConsentFn: VoidFunction;
vi.mock( "@/services/font-service", () => ({
    fontsConsented: () => mockFontsConsented,
    consentFonts: () => mockFontConsentFn(),
    rejectFonts: vi.fn(),
}));
let mockUpdateFn: ( fn: string, ...args: any[] ) => void;
vi.mock( "@/utils/file-util", () => ({
    selectFile: (...args: any[]) => mockUpdateFn?.( "selectFile", ...args ),
    saveBlobAsFile: (...args: any[]) => mockUpdateFn?.( "saveBlobAsFile", ...args ),
}));
vi.mock("@/utils/canvas-util", () => ({
    createCanvas: vi.fn(() => ({ cvs: {}, ctx: {} })),
    imageToBase64: vi.fn(),
    imageToCanvas: vi.fn(),
    base64ToLayerImage: vi.fn()
}));
mockZCanvas();

describe( "Vuex store", () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    describe( "getters", () => {
        it( "should know when there is currently a loading state active", () => {
            const state = createState({ loadingStates: [] });
            expect( getters.isLoading( state )).toBe( false );
            state.loadingStates.push( "foo" );
            expect( getters.isLoading( state )).toBe( true );
        });
    });

    describe( "mutations", () => {
        it( "should be able to toggle the opened state of the menu", () => {
            const state = createState({ menuOpened: false });
            mutations.setMenuOpened( state, true );
            expect( state.menuOpened ).toBe( true );
        });

        it( "should be able to toggle the opened state of the toolbox", () => {
            const state = createState({ toolboxOpened: false });
            mutations.setToolboxOpened( state, true );
            expect( state.toolboxOpened ).toBe( true );
        });

        describe( "when managing the opened panels", () => {
            it( "should be able to add individual panels to the opened panels list", () => {
                const state = createState({ openedPanels: [ "foo" ] });
                mutations.setOpenedPanel( state, "bar" );
                expect( state.openedPanels ).toEqual([ "foo", "bar" ]);
            });

            it( "should be able to close individual panels in the opened panels list", () => {
                const state = createState({ openedPanels: [ "foo", "bar" ] });
                mutations.setOpenedPanel( state, "foo" );
                expect( state.openedPanels ).toEqual([ "bar" ]);
            });

            it( "should be able to close all opened panels", () => {
                const state = createState({ openedPanels: [ "foo", "bar" ] });
                mutations.closeOpenedPanels( state );
                expect( state.openedPanels ).toHaveLength( 0 );
            });
        });

        it( "should be able to set the current selection content", () => {
            const state = createState({ selectionContent: null });
            const selection = { image: createMockImageElement(), size: { width: 100, height: 50 } };
            mutations.setSelectionContent( state, selection );
            expect( state.selectionContent ).toEqual( selection );
        });

        it( "should be able to toggle the active state of the blinding layer", () => {
            const state = createState({ blindActive: false });
            mutations.setBlindActive( state, true );
            expect( state.blindActive ).toBe( true );
        });

        it( "should be able to set the global Document pan mode", () => {
            const state = createState({ panMode: false });
            mutations.setPanMode( state, true );
            expect( state.panMode ).toBe( true );
        });

        describe( "when toggling loading states", () => {
            it( "should be able to register a new loading state", () => {
                const state = createState({ loadingStates: [ "foo" ] });
                mutations.setLoading( state, "bar" );
                expect( state.loadingStates ).toEqual([ "foo", "bar" ]);
            });

            it( "should be able to unregister an existing loading state", () => {
                const state = createState({ loadingStates: [ "foo", "bar" ] });
                mutations.unsetLoading( state, "foo" );
                expect( state.loadingStates ).toEqual([ "bar" ]);
            });
        });

        describe( "when toggling dialog windows", () => {
            it( "should be able to open a dialog window and apply its request parameters", () => {
                const state = createState({ dialog: null });
                const params = {
                    type: "info",
                    title: "title",
                    message: "message",
                    link: { href: "foo", title: "bar" },
                    confirm: vi.fn(),
                    cancel: vi.fn()
                } as Dialog;
                mutations.openDialog( state, params );
                expect( state.dialog ).toEqual( params );
            });

            it( "should be able to apply default values when opening a dialog window without parameters", () => {
                const state = createState({ dialog: null });
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
                const state = createState({ dialog: { type: "info", title: "foo", message: "bar" } });
                mutations.closeDialog( state );
                expect( state.dialog ).toBeNull();
            });
        });

        describe( "when toggling the modal window", () => {
            it( "should be able to set the opened modal", () => {
                const state = createState({ blindActive: false, modal: null });
                mutations.openModal( state, SAVE_DOCUMENT );
                expect( state.blindActive ).toBe( true );
                expect( state.modal ).toEqual( SAVE_DOCUMENT );
            });

            it( "should be able to unset the opened modal", () => {
                const state = createState({ blindActive: true, modal: SAVE_DOCUMENT });
                mutations.openModal( state, null );
                expect( state.blindActive ).toBe( false );
                expect( state.modal ).toBeNull();
            });

            it( "should be able to close the currently opened modal, if existing", () => {
                const state = createState({ blindActive: true, modal: SAVE_DOCUMENT });
                mutations.closeModal( state );
                expect( state.blindActive ).toBe( false );
                expect( state.modal ).toBeNull();
            });

            it( "should suspend the keyboard service on open to not conflict with form inputs", () => {
                const state = createState({ blindActive: false, modal: null });
                const keyboardSpy = vi.spyOn( KeyboardService, "setSuspended" );

                mutations.openModal( state, SAVE_DOCUMENT );
                expect( keyboardSpy ).toHaveBeenCalledWith( true );
            });

            it( "should unsuspend the keyboard service on close", () => {
                const state = createState({ blindActive: true, modal: SAVE_DOCUMENT });
                const keyboardSpy = vi.spyOn( KeyboardService, "setSuspended" );

                mutations.closeModal( state );
                expect( keyboardSpy ).toHaveBeenCalledWith( false );
            });
        });

        describe( "when showing notification messages", () => {
            it( "should be able to show a notification displaying its title and message", () => {
                const state = createState({ notifications: [] });
                mutations.showNotification(state, { title: "foo", message: "bar" });
                expect(state.notifications).toEqual([{ title: "foo", message: "bar" }]);
            });

            it( "should be able to show a notification using a default title when none was specified", () => {
                const state = createState({ notifications: [] });

                mutations.showNotification( state, { message: "foo" });

                expect( state.notifications ).toEqual([{ title: "title.success", message: "foo" }]);
            });

            it( "should be able to queue multiple notifications", () => {
                const state = createState({ notifications: [] });

                mutations.showNotification( state, { title: "foo", message: "bar" });
                mutations.showNotification( state, { title: "baz", message: "qux" });

                expect( state.notifications ).toEqual([
                    { title: "foo", message: "bar" },
                    { title: "baz", message: "qux" }
                ]);
            });

            it( "should be able to clear all queued notifications", () => {
                const state = createState({ notifications: [{ title: "bar", message: "baz" }, { title: "qux", message: "quuz" }]});
                mutations.clearNotifications(state);
                expect(state.notifications).toEqual([]);
            });
        });

        it( "should be able to set the window size", () => {
            const state = createState({ windowSize: { width: 0, height: 0 }});
            const width = 500;
            const height = 400;
            mutations.setWindowSize( state, { width, height });
            expect( state.windowSize ).toEqual({ width, height });
        });

        it( "should be able to set the storage type", () => {
            const state = createState({ storageType: STORAGE_TYPES.LOCAL });
            mutations.setStorageType( state, STORAGE_TYPES.S3 );
            expect( state.storageType ).toEqual( STORAGE_TYPES.S3 );
        });

        it( "should be able to set the Dropbox connection status", () => {
            const state = createState({ dropboxConnected: false });
            mutations.setDropboxConnected( state, true );
            expect( state.dropboxConnected ).toEqual( true );
        });

        it( "should be able to set the Google Drive connection status", () => {
            const state = createState({ driveConnected: false });
            mutations.setDriveConnected( state, true );
            expect( state.driveConnected ).toEqual( true );
        });
    });

    describe( "actions", () => {
        describe( "when loading a saved document", () => {
            it( "should be able to load a saved document by using the file selector", async () => {
                const commit = vi.fn();
                const mockFile = { name: "file" };
                const mockDocument = DocumentFactory.create({ name: "foo" });

                mockUpdateFn = vi.fn( fn => {
                    switch ( fn ) {
                        default:
                            return true;
                        case "selectFile":
                            return [ mockFile ];
                    }
                });
                const fromBlobSpy = vi.spyOn( DocumentFactory, "fromBlob" ).mockResolvedValue( mockDocument );

                // @ts-expect-error not assignable to parameter of type 'ActionContext<BitMapperyState, any>'
                await actions.loadDocument({ commit });

                // assert file selector has been prompted
                expect( mockUpdateFn ).toHaveBeenCalledWith( "selectFile", expect.any( String ), expect.any( Boolean ));
                // assert selected file is converted from Blob to document
                expect( fromBlobSpy ).toHaveBeenCalledWith( mockFile );
                // assert resulting Document has been added as the active document
                expect( commit ).toHaveBeenNthCalledWith( 1, "setLoading", "doc" );
                expect( commit ).toHaveBeenNthCalledWith( 2, "addNewDocument", mockDocument );
                expect( commit ).toHaveBeenNthCalledWith( 3, "showNotification", expect.any( Object ));
                expect( commit ).toHaveBeenNthCalledWith( 4, "unsetLoading", "doc" );
            });

            it( "should be able to load a saved document from a given File/Blob", async () => {
                const commit = vi.fn();
                const blob = { name: "file" };
                const mockDocument = DocumentFactory.create({ name: "foo" });

                const fromBlobSpy = vi.spyOn( DocumentFactory, "fromBlob" ).mockResolvedValue( mockDocument );

                // @ts-expect-error not assignable to parameter of type 'ActionContext<BitMapperyState, any>'
                await actions.loadDocument({ commit }, blob );

                // assert give file is converted from Blob to document
                expect( fromBlobSpy ).toHaveBeenCalledWith( blob );
                // assert resulting Document has been added as the active document
                expect( commit ).toHaveBeenNthCalledWith( 1, "setLoading", "doc" );
                expect( commit ).toHaveBeenNthCalledWith( 2, "addNewDocument", mockDocument );
                expect( commit ).toHaveBeenNthCalledWith( 3, "showNotification", expect.any( Object ));
                expect( commit ).toHaveBeenNthCalledWith( 4, "unsetLoading", "doc" );
            });

            describe( "and the document has text layers", () => {
                it( "should request user consent for using Google Fonts, if none had been given yet", async () => {
                    const commit = vi.fn();
                    const blob = { name: "file" };
                    const mockDocument = DocumentFactory.create({
                        name: "foo",
                        layers: [
                            LayerFactory.create({ type: LayerTypes.LAYER_TEXT })
                        ]
                    });

                    mockFontsConsented = false;
                    mockFontConsentFn = vi.fn();

                    vi.spyOn( DocumentFactory, "fromBlob" ).mockResolvedValue( mockDocument );

                    // @ts-expect-error not assignable to parameter of type 'ActionContext<BitMapperyState, any>'
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
                    const commit = vi.fn();
                    const blob = { name: "file" };
                    
                    const mockDocument = DocumentFactory.create({
                        name: "foo",
                        layers: [
                            LayerFactory.create({ type: LayerTypes.LAYER_TEXT })
                        ]
                    });
                    mockFontsConsented = true;

                    vi.spyOn( DocumentFactory, "fromBlob" ).mockResolvedValue( mockDocument );

                    // @ts-expect-error not assignable to parameter of type 'ActionContext<BitMapperyState, any>'
                    await actions.loadDocument({ commit }, blob );

                    // assert dialog was not shown
                    expect( commit ).not.toHaveBeenCalledWith( "openDialog" );
                    // and document was loaded immediately
                    expect( commit ).toHaveBeenCalledWith( "addNewDocument", mockDocument );
                });
            });
        });

        it( "should be able to save the currently opened document", async () => {
            const commit = vi.fn();
            const mockedGetters = {
                activeDocument: DocumentFactory.create({ name: "foo" }),
            };
            const mockSavedDocument = { n: "foo" };
            mockUpdateFn = vi.fn( _fn => {
                return true;
            });

            const toBlobSpy = vi.spyOn( DocumentFactory, "toBlob" ).mockResolvedValue( new Blob() );

            // @ts-expect-error not assignable to parameter of type 'ActionContext<BitMapperyState, any>'
            await actions.saveDocument({ commit, getters: mockedGetters }, "foo" );

            // assert the active document is serialized by DocumentFactory.toBlob
            expect( toBlobSpy ).toHaveBeenCalledWith( mockedGetters.activeDocument );
            // assert the resulting Blob will be saved to a File
            expect( mockUpdateFn ).toHaveBeenCalledWith( "saveBlobAsFile", expect.any( Object ), `foo.${PROJECT_FILE_EXTENSION}` );
            expect( commit ).toHaveBeenCalledWith( "showNotification", expect.any( Object ));
        });

        it( "should be able to paste the current in-memory image selection at the center of the Document", async () => {
            const state = createState({
                selectionContent: {
                    image: createMockImageElement(),
                    size: {
                        width: 40,
                        height: 30
                    }
                },
            });
            const mockedGetters = { activeDocument: { width: 200, height: 150, layers: [] as Layer[] } };
            const commit   = vi.fn();
            const dispatch = vi.fn();

            // @ts-expect-error not assignable to parameter of type 'ActionContext<BitMapperyState, any>'
            await actions.pasteSelection({ state, getters: mockedGetters, commit, dispatch });
            
            expect( commit ).toHaveBeenCalledWith( "insertLayerAtIndex", { index: 0, layer: expect.any( Object ) });
            expect( dispatch ).toHaveBeenCalledWith( "clearSelection" );
        });
    });
});
