import KeyboardService from "@/services/keyboard-service";
import documentModule  from "./modules/document-module";
import imageModule     from "./modules/image-module";
import toolModule      from "./modules/tool-module";

// cheat a little by exposing the vue-i18n translations directly to the
// store so we can commit translated error/success messages from actions

let i18n;
const translate = ( key, optArgs ) => i18n?.t( key, optArgs ) ?? key;

export default {
    modules: {
        documentModule,
        imageModule,
        toolModule,
    },
    state: {
        menuOpened: false,
        toolboxOpened: false,
        optionsPanelOpened: true,
        blindActive: false,
        dialog: null,
        modal: null,
        windowSize: { width: window.innerWidth, height: window.innerHeight },
    },
    getters: {
        // eslint-disable-next-line no-unused-vars
        t: state => ( key, optArgs ) => translate( key, optArgs ),
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
        setBlindActive( state, active ) {
            state.blindActive = !!active;
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
        },
        closeModal( state ) {
            state.blindActive = false;
            state.modal = null;
        },
        /**
         * cache the resize in the store so components can react to these values
         * instead of maintaining multiple listeners at the expense of DOM trashing/performance hits
         */
        setWindowSize( state, { width, height }) {
            state.windowSize = { width, height };
        },
    },
    actions: {
        /**
         * Install the services that will listen to global hardware events
         *
         * @param {Object} i18nReference vue-i18n Object instance so we can
         *                 access translations inside Vuex store modules
         */
        setupServices( store, i18nReference ) {
            i18n = i18nReference;
            const storeReference = this;
            return new Promise( resolve => {
                KeyboardService.init( storeReference );
                resolve();
            });
        }
    },
};
