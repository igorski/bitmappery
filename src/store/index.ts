/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { ActionContext } from "vuex";
import type { Size } from "zcanvas";
import type { Notification, Dialog, CopiedSelection } from "@/definitions/editor";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { LayerTypes } from "@/definitions/layer-types";
import { PANEL_TOOL_OPTIONS, PANEL_LAYERS } from "@/definitions/panel-types";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { initHistory, enqueueState } from "@/factories/history-state-factory";
import { getRendererForLayer } from "@/factories/renderer-factory";
import { getCanvasInstance } from "@/services/canvas-service";
import { fontsConsented, consentFonts, rejectFonts } from "@/services/font-service";
import KeyboardService from "@/services/keyboard-service";
import { cloneCanvas } from "@/utils/canvas-util";
import { copySelection, deleteSelectionContent } from "@/utils/document-util";
import { saveBlobAsFile, selectFile } from "@/utils/file-util";
import { replaceLayerSource } from "@/utils/layer-util";
import { truncate } from "@/utils/string-util";
import canvas, { CanvasState } from "./modules/canvas-module";
import document, { DocumentState } from "./modules/document-module";
import history, { HistoryState } from "./modules/history-module";
import image, { ImageState } from "./modules/image-module";
import preferences, { PreferencesState } from "./modules/preferences-module";
import tool, { ToolState } from "./modules/tool-module";

export interface BitMapperyState {
    menuOpened: boolean;
    toolboxOpened: boolean;
    openedPanels: string[];
    selectionContent: CopiedSelection | null; // clipboard content of copied images
    blindActive: boolean;
    panMode: boolean;         // whether drag interactions with the document will pan its viewport
    selectMode: boolean;      // whether the currently active tool is a selection type (works across layers)
    layerSelectMode: boolean; // whether clicking on the document should act as layer selection
    dialog: Dialog | null;    // currently opened dialog
    modal: number | null;     // currently opened modal (see modal-windows definition)
    loadingStates: string[];  // wether one or more long running operations (identified by string key) are running
    notifications: Notification[]; // notification message queue
    storageType: STORAGE_TYPES;
    dropboxConnected: boolean;
    driveConnected: boolean;
    windowSize: Size;

    // store sub-module states

    canvas: CanvasState;
    document: DocumentState;
    history: HistoryState;
    image: ImageState;
    preferences: PreferencesState;
    tool: ToolState;
};

// cheat a little by exposing the vue-i18n translations directly to the
// store so we can commit translated error/success messages from actions

let translator: ( key: string, ...opts: unknown[] ) => string;
const translate = ( key: string, optArgs?: any ): string => {
    return typeof translator === "function" ? translator?.( key, optArgs ) as string : key;
}

export default {
    modules: {
        canvas,
        document,
        history,
        image,
        preferences,
        tool,
    },
    // @ts-expect-error sub module states are injected by Vuex on store creation
    state: (): BitMapperyState => ({
        menuOpened: false,
        toolboxOpened: false,
        openedPanels: [ PANEL_TOOL_OPTIONS, PANEL_LAYERS ],
        selectionContent: null,
        blindActive: false,
        panMode: false,
        selectMode: false,
        layerSelectMode: false,
        dialog: null,
        modal: null,
        loadingStates: [],
        notifications: [],
        storageType: STORAGE_TYPES.LOCAL,
        dropboxConnected: false, // whether a Dropbox session has been authorized
        driveConnected: false, // whether a Google Drive session has been authorized
        windowSize: {
            width: window.innerWidth,
            height: window.innerHeight
        },
    }),
    getters: {
        t: () => ( key: string, optArgs?: any ): string => translate( key, optArgs ),
        isLoading: ( state: BitMapperyState ): boolean => state.loadingStates.length > 0,
    },
    mutations: {
        setMenuOpened( state: BitMapperyState, value: boolean ): void {
            state.menuOpened = !!value;
        },
        setToolboxOpened( state: BitMapperyState, value: boolean ): void {
            state.toolboxOpened = !!value;
        },
        setOpenedPanel( state: BitMapperyState, panel: string ): void {
            if ( state.openedPanels.includes( panel )) {
                state.openedPanels.splice( state.openedPanels.indexOf( panel ), 1 );
            } else {
                state.openedPanels.push( panel );
            }
        },
        closeOpenedPanels( state: BitMapperyState ): void {
            state.openedPanels = [];
        },
        setSelectionContent( state: BitMapperyState, image: CopiedSelection ): void {
            state.selectionContent = image;
        },
        setBlindActive( state: BitMapperyState, active: boolean ): void {
            state.blindActive = !!active;
        },
        setPanMode( state: BitMapperyState, value: boolean ): void {
            state.panMode = value;
        },
        setSelectMode( state: BitMapperyState, value: boolean ): void {
            state.selectMode = value;
        },
        setLayerSelectMode( state: BitMapperyState, value: boolean ): void {
            state.layerSelectMode = value;
        },
        setLoading( state: BitMapperyState, key: string ): void {
            if ( !state.loadingStates.includes( key )) {
                state.loadingStates.push( key );
            }
        },
        unsetLoading( state: BitMapperyState, key: string ): void {
            const idx = state.loadingStates.indexOf( key );
            if ( idx > -1 ) {
                state.loadingStates.splice( idx, 1 );
            }
        },
        /**
         * open a dialog window showing given title and message.
         * types can be info, error or confirm. When type is confirm, optional
         * confirmation and cancellation handler can be passed.
         */
        openDialog( state: BitMapperyState,
            { type = "info", title = "", message = "", link = null, confirm = null, cancel = null }: Dialog ): void {
            state.dialog = { type, title , message, link, confirm, cancel };
        },
        closeDialog( state: BitMapperyState ): void {
            state.dialog = null;
        },
        openModal( state: BitMapperyState, modalName: number ): void {
            state.blindActive = !!modalName;
            state.modal = modalName;
            KeyboardService.setSuspended( !!state.modal );
        },
        closeModal( state: BitMapperyState ): void {
            state.blindActive = false;
            state.modal = null;
            KeyboardService.setSuspended( false );
        },
        /**
         * shows a notification containing given title and message.
         * multiple notifications can be stacked.
         */
        showNotification( state: BitMapperyState, { message = "", title = null }: Notification ): void {
            state.notifications = [ ...state.notifications, { title: title || translate( "title.success" ), message }];
        },
        clearNotifications( state: BitMapperyState ): void {
            state.notifications = [];
        },
        /**
         * cache the resize in the store so components can react to these values
         * instead of maintaining multiple listeners at the expense of DOM trashing/performance hits
         */
        setWindowSize( state: BitMapperyState, { width, height }: Size ): void {
            state.windowSize = { width, height };
        },
        setStorageType( state: BitMapperyState, value: STORAGE_TYPES ): void {
            state.storageType = value;
        },
        setDropboxConnected( state: BitMapperyState, value: boolean ): void {
            state.dropboxConnected = value;
        },
        setDriveConnected( state: BitMapperyState, value: boolean ): void {
            state.driveConnected = value;
        },
    },
    actions: {
        async loadDocument({ commit }: ActionContext<BitMapperyState, any>, file?: File ): Promise<void> {
            if ( !file ) {
                const fileList = await selectFile( `.${PROJECT_FILE_EXTENSION}`, false );
                if ( !fileList?.length ) {
                    return;
                }
                file = fileList[ 0 ];
            }
            commit( "setLoading", "doc" );
            try {
                const document = await DocumentFactory.fromBlob( file );
                const openDocument = () => {
                    commit( "addNewDocument", document );
                    commit( "showNotification", {
                        message: translate( "loadedFileSuccessfully", { file: truncate( file!.name, 35 ) })
                    });
                };
                // if document contains text, show GDPR consention message before using Google Fonts
                if ( !fontsConsented() && document.layers?.some(({ type }) => type === LayerTypes.LAYER_TEXT )) {
                    commit( "openDialog", {
                        type: "confirm",
                        title: translate( "fonts.consentRequired" ),
                        message: translate( "fonts.consentExpl" ),
                        confirm: () => {
                            consentFonts();
                            openDocument();
                        },
                        cancel: () => {
                            rejectFonts();
                            openDocument();
                        }
                    });
                } else {
                    openDocument();
                }
            } catch ( e ) {
                commit( "showNotification", {
                    title: translate( "title.error" ),
                    message: translate( "errorLoadingFile", { file: truncate( file!.name, 35 ) })
                });
            }
            commit( "unsetLoading", "doc" );
        },
        async saveDocument({ commit, getters }: ActionContext<BitMapperyState, any>, name?: string ): Promise<void> {
            if ( !name ) {
                name = getters.activeDocument.name;
            }
            const binary = await DocumentFactory.toBlob( getters.activeDocument );
            saveBlobAsFile( binary, `${name!.split( "." )[ 0 ]}.${PROJECT_FILE_EXTENSION}` );
            commit( "showNotification", {
                message: translate( "savedFileSuccessfully" , { file: truncate( name, 35 ) })
            });
        },
        async requestSelectionCopy({ commit, getters }: ActionContext<BitMapperyState, any>, { merged = false, isCut = false }): Promise<void> {
            const selectionImage = await copySelection( getters.activeDocument, getters.activeLayer, merged );
            commit( "setSelectionContent", selectionImage );
            commit( "setActiveTool", { tool: null, activeLayer: getters.activeLayer });
            commit( "showNotification", { message: translate( isCut ? "selectionCut" : "selectionCopied" ) });
        },
        async requestSelectionCut({ dispatch }: ActionContext<BitMapperyState, any> ): Promise<void> {
            dispatch( "requestSelectionCopy", { merged: false, isCut: true });
            dispatch( "deleteInSelection" );
        },
        clearSelection(): void {
            getCanvasInstance()?.interactionPane.resetSelection();
        },
        invertSelection({ commit }: ActionContext<BitMapperyState, any> ): void {
            getCanvasInstance()?.interactionPane.invertSelection();
            commit( "showNotification", { message: translate( "selectionInverted") });
        },
        pasteSelection({ commit, getters, dispatch, state }: ActionContext<BitMapperyState, any> ): void {
            const selection = state.selectionContent;
            const { bitmap, type } = selection;
            const layer = LayerFactory.create({
                type: ( !type || type === LayerTypes.LAYER_TEXT ) ? LayerTypes.LAYER_GRAPHIC : type,
                source: cloneCanvas( bitmap ),
                width: bitmap.width,
                height: bitmap.height,
                left: getters.activeDocument.width  / 2 - bitmap.width  / 2,
                top : getters.activeDocument.height / 2 - bitmap.height / 2,
            });
            const index = getters.activeDocument.layers.length;
            const paste = () => {
                commit( "insertLayerAtIndex", { index, layer });
                dispatch( "clearSelection" );
            };
            paste();
            enqueueState( `paste_${type}_${bitmap.width}_${bitmap.height}`, {
                undo() {
                    commit( "setSelectionContent", selection );
                    commit( "removeLayer", index );
                },
                redo: paste
            });
        },
        async deleteInSelection({ getters }: ActionContext<BitMapperyState, any> ): Promise<void> {
            const activeLayer = getters.activeLayer;
            if ( !activeLayer || !getters.activeDocument?.activeSelection.length ) {
                return;
            }
            const hasMask       = !!activeLayer.mask;
            const orgContent    = cloneCanvas( hasMask ? activeLayer.mask : activeLayer.source );
            const updatedBitmap = deleteSelectionContent( getters.activeDocument, activeLayer );
            const replaceSource = ( newSource: HTMLCanvasElement ) => {
                replaceLayerSource( activeLayer, newSource, hasMask );
                getRendererForLayer( activeLayer )?.resetFilterAndRecache();
            };
            replaceSource( updatedBitmap );
            enqueueState( `deleteFromSelection_${activeLayer.id}`, {
                undo() {
                    replaceSource( orgContent );
                },
                redo() {
                    replaceSource( updatedBitmap );
                }
            });
        },
        /**
         * Install the services that will listen to global hardware events
         *
         * @param {Object} i18nReference vue-i18n Object instance so we can
         *                 access translations inside Vuex store modules
         */
        setupServices({ dispatch }: ActionContext<BitMapperyState, any>, i18nTranslator: ( key: string, ...opts: unknown[] ) => string ): Promise<void> {
            translator = i18nTranslator;
            const storeReference = this;
            return new Promise( async resolve => {
                KeyboardService.init( storeReference );
                initHistory( storeReference );
                await dispatch( "restorePreferences" );
                resolve();
            });
        },
    },
};
