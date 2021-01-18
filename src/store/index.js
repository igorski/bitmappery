/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
import { LAYER_IMAGE }   from "@/definitions/layer-types";
import { runSpriteFn }   from "@/factories/sprite-factory";
import canvasModule      from "./modules/canvas-module";
import documentModule    from "./modules/document-module";
import historyModule     from "./modules/history-module";
import imageModule       from "./modules/image-module";
import preferencesModule from "./modules/preferences-module";
import toolModule        from "./modules/tool-module";
import { cloneCanvas } from "@/utils/canvas-util";
import { copySelection, deleteSelectionContent } from "@/utils/document-util";
import { saveBlobAsFile, selectFile } from "@/utils/file-util";
import { replaceLayerSource } from "@/utils/layer-util";
import { truncate } from "@/utils/string-util";

export const PROJECT_FILE_EXTENSION = ".bpy";

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
        optionsPanelOpened: true,
        selectionContent: null, // clipboard content of copied images ({ image, size })
        blindActive: false,
        panMode: false,         // whether drag interactions with the document will pan its viewport
        selectMode: false,      // whether the currently active tool is a selection type (works across layers)
        layerSelectMode: false, // whether clicking on the document should act as layer selection
        dialog: null,           // currently opened dialog
        modal: null,            // currently opened modal
        loadingStates: [],      // wether one or more long running operations are running
        notifications: [],      // notification message queue
        dropboxConnected: false,
        windowSize: {
            width: window.innerWidth,
            height: window.innerHeight
        },
    },
    getters: {
        // eslint-disable-next-line no-unused-vars
        t: state => ( key, optArgs ) => translate( key, optArgs ),
        isLoading: state => state.loadingStates.length > 0,
    },
    mutations: {
        setMenuOpened( state, value ) {
            state.menuOpened = !!value;
        },
        setToolboxOpened( state, value ) {
            state.toolboxOpened = !!value;
        },
        setOptionsPanelOpened( state, value ) {
            state.optionsPanelOpened = !!value;
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
        openDialog( state, { type = "info", title = "", message = "", confirm = null, cancel = null }) {
            state.dialog = { type, title , message, confirm, cancel };
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
        setDropboxConnected( state, value ) {
            state.dropboxConnected = value;
        },
    },
    actions: {
        async loadDocument({ commit }, file = null ) {
            if ( !file ) {
                const fileList = await selectFile( PROJECT_FILE_EXTENSION, false );
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
            saveBlobAsFile( binary, `${name.split( "." )[ 0 ]}${PROJECT_FILE_EXTENSION}` );
            commit( "showNotification", {
                message: translate( "savedFileSuccessfully" , { file: truncate( name, 35 ) })
            });
        },
        async requestSelectionCopy({ commit, dispatch, getters }) {
            const selectionImage = await copySelection( getters.activeDocument, getters.activeLayer );
            commit( "setSelectionContent", selectionImage );
            commit( "setActiveTool", { tool: null, activeLayer: getters.activeLayer });
            commit( "showNotification", { message: translate( "selectionCopied" ) });
            dispatch( "clearSelection" );
        },
        clearSelection({ getters }) {
            getCanvasInstance()?.interactionPane.resetSelection();
            getSpriteForLayer( getters.activeLayer )?.resetSelection();
        },
        pasteSelection({ commit, getters, dispatch, state }) {
            const selection       = state.selectionContent;
            const { image, size } = selection;
            const layer = LayerFactory.create({
                type: LAYER_IMAGE,
                source: image,
                ...size,
                x: getters.activeDocument.width  / 2 - size.width  / 2,
                y: getters.activeDocument.height / 2 - size.height / 2,
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
        async deleteInSelection({ getters, state }) {
            const activeLayer = getters.activeLayer;
            if ( !activeLayer || !getters.activeDocument?.selection.length ) {
                return;
            }
            const orgContent = cloneCanvas( activeLayer.source );
            const updatedBitmap = deleteSelectionContent( getters.activeDocument, activeLayer );
            const replaceSource = newSource => {
                replaceLayerSource( activeLayer, newSource );
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
            return new Promise( resolve => {
                KeyboardService.init( storeReference );
                initHistory( storeReference );
                dispatch( "restorePreferences" );
                resolve();
            });
        },
    },
};
