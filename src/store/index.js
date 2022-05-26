/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
import KeyboardService from "@/services/keyboard-service";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory    from "@/factories/layer-factory";
import { initHistory, enqueueState } from "@/factories/history-state-factory";
import { getCanvasInstance, getSpriteForLayer } from "@/factories/sprite-factory";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { LAYER_GRAPHIC } from "@/definitions/layer-types";
import { PANEL_TOOL_OPTIONS, PANEL_LAYERS } from "@/definitions/panel-types";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import canvasModule      from "./modules/canvas-module";
import documentModule    from "./modules/document-module";
import historyModule     from "./modules/history-module";
import imageModule       from "./modules/image-module";
import preferencesModule from "./modules/preferences-module";
import toolModule        from "./modules/tool-module";
import { cloneCanvas, imageToCanvas } from "@/utils/canvas-util";
import { copySelection, deleteSelectionContent } from "@/utils/document-util";
import { saveBlobAsFile, selectFile } from "@/utils/file-util";
import { replaceLayerSource } from "@/utils/layer-util";
import { truncate } from "@/utils/string-util";

// cheat a little by exposing the vue-i18n translations directly to the
// store so we can commit translated error/success messages from actions

let i18n;
const translate = ( key, optArgs ) => i18n?.t( key, optArgs ) ?? key;

export default {
    modules: {
        canvasModule,
        documentModule,
        historyModule,
        imageModule,
        preferencesModule,
        toolModule,
    },
    state: {
        menuOpened: false,
        toolboxOpened: false,
        openedPanels: [ PANEL_TOOL_OPTIONS, PANEL_LAYERS ],
        selectionContent: null, // clipboard content of copied images ({ image, size })
        blindActive: false,
        panMode: false,         // whether drag interactions with the document will pan its viewport
        selectMode: false,      // whether the currently active tool is a selection type (works across layers)
        layerSelectMode: false, // whether clicking on the document should act as layer selection
        dialog: null,           // currently opened dialog
        modal: null,            // currently opened modal
        loadingStates: [],      // wether one or more long running operations are running
        notifications: [],      // notification message queue
        storageType: STORAGE_TYPES.LOCAL,
        dropboxConnected: false,
        driveConnected: false,
        windowSize: {
            width: window.innerWidth,
            height: window.innerHeight
        },
    },
    getters: {
        // eslint-disable-next-line no-unused-vars
        t: state => ( key, optArgs ) => translate( key, optArgs ),
        isLoading: state => state.loadingStates.length > 0,
        hasCloudConnection: state => state.dropboxConnected || state.driveConnected,
    },
    mutations: {
        setMenuOpened( state, value ) {
            state.menuOpened = !!value;
        },
        setToolboxOpened( state, value ) {
            state.toolboxOpened = !!value;
        },
        setOpenedPanel( state, panel ) {
            if ( state.openedPanels.includes( panel )) {
                state.openedPanels.splice( state.openedPanels.indexOf( panel ), 1 );
            } else {
                state.openedPanels.push( panel );
            }
        },
        closeOpenedPanels( state ) {
            state.openedPanels = [];
        },
        setSelectionContent( state, image ) {
            state.selectionContent = image;
        },
        setBlindActive( state, active ) {
            state.blindActive = !!active;
        },
        setPanMode( state, value ) {
            state.panMode = value;
        },
        setSelectMode( state, value ) {
            state.selectMode = value;
        },
        setLayerSelectMode( state, value ) {
            state.layerSelectMode = value;
        },
        setLoading( state, key ) {
            if ( !state.loadingStates.includes( key )) {
                state.loadingStates.push( key );
            }
        },
        unsetLoading( state, key ) {
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
        openDialog( state, { type = "info", title = "", message = "", link = null, confirm = null, cancel = null }) {
            state.dialog = { type, title , message, link, confirm, cancel };
        },
        closeDialog( state ) {
            state.dialog = null;
        },
        openModal( state, modalName ) {
            state.blindActive = !!modalName;
            state.modal = modalName;
            KeyboardService.setSuspended( !!state.modal );
        },
        closeModal( state ) {
            state.blindActive = false;
            state.modal = null;
            KeyboardService.setSuspended( false );
        },
        /**
         * shows a notification containing given title and message.
         * multiple notifications can be stacked.
         */
        showNotification( state, { message = "", title = null }) {
            state.notifications.push({ title: title || translate( "title.success" ), message });
        },
        clearNotifications( state ) {
            state.notifications = [];
        },
        /**
         * cache the resize in the store so components can react to these values
         * instead of maintaining multiple listeners at the expense of DOM trashing/performance hits
         */
        setWindowSize( state, { width, height }) {
            state.windowSize = { width, height };
        },
        setStorageType( state, value ) {
            state.storageType = value;
        },
        setDropboxConnected( state, value ) {
            state.dropboxConnected = value;
        },
        setDriveConnected( state, value ) {
            state.driveConnected = value;
        },
    },
    actions: {
        async loadDocument({ commit }, file = null ) {
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
                commit( "addNewDocument", document );
                commit( "showNotification", {
                    message: translate( "loadedFileSuccessfully", { file: truncate( file.name, 35 ) })
                });
            } catch ( e ) {
                commit( "showNotification", {
                    title: translate( "title.error" ),
                    message: translate( "errorLoadingFile", { file: truncate( file.name, 35 ) })
                });
            }
            commit( "unsetLoading", "doc" );
        },
        async saveDocument({ commit, getters }, name = null ) {
            if ( !name ) {
                name = getters.activeDocument.name;
            }
            const binary = await DocumentFactory.toBlob( getters.activeDocument );
            saveBlobAsFile( binary, `${name.split( "." )[ 0 ]}.${PROJECT_FILE_EXTENSION}` );
            commit( "showNotification", {
                message: translate( "savedFileSuccessfully" , { file: truncate( name, 35 ) })
            });
        },
        async requestSelectionCopy({ commit, getters }, copyMerged = false ) {
            const selectionImage = await copySelection( getters.activeDocument, getters.activeLayer, copyMerged );
            commit( "setSelectionContent", selectionImage );
            commit( "setActiveTool", { tool: null, activeLayer: getters.activeLayer });
            commit( "showNotification", { message: translate( "selectionCopied" ) });
        },
        async requestSelectionCut({ dispatch }) {
            dispatch( "requestSelectionCopy" );
            dispatch( "deleteInSelection" );
        },
        clearSelection() {
            getCanvasInstance()?.interactionPane.resetSelection();
        },
        invertSelection({ commit }) {
            getCanvasInstance()?.interactionPane.invertSelection();
            commit( "showNotification", { message: translate( "selectionInverted") });
        },
        pasteSelection({ commit, getters, dispatch, state }) {
            const selection       = state.selectionContent;
            const { image, size } = selection;
            const layer = LayerFactory.create({
                type: LAYER_GRAPHIC,
                source: imageToCanvas( image, size.width, size.height ),
                ...size,
                left: getters.activeDocument.width  / 2 - size.width  / 2,
                top : getters.activeDocument.height / 2 - size.height / 2,
            });
            const index = getters.activeDocument.layers.length;
            const paste = () => {
                commit( "insertLayerAtIndex", { index, layer });
                dispatch( "clearSelection" );
            };
            paste();
            enqueueState( `paste_${selection.length}`, {
                undo() {
                    commit( "setSelectionContent", selection );
                    commit( "removeLayer", index );
                },
                redo: paste
            });
        },
        async deleteInSelection({ getters }) {
            const activeLayer = getters.activeLayer;
            if ( !activeLayer || !getters.activeDocument?.selection.length ) {
                return;
            }
            const hasMask       = !!activeLayer.mask;
            const orgContent    = cloneCanvas( hasMask ? activeLayer.mask : activeLayer.source );
            const updatedBitmap = deleteSelectionContent( getters.activeDocument, activeLayer );
            const replaceSource = newSource => {
                replaceLayerSource( activeLayer, newSource, hasMask );
                getSpriteForLayer( activeLayer )?.resetFilterAndRecache();
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
        setupServices({ dispatch }, i18nReference ) {
            i18n = i18nReference;
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
