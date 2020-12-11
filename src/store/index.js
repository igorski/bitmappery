import documentModule from './modules/document-module';
import imageModule    from './modules/image-module';

export default {
    modules: {
        documentModule,
        imageModule,
    },
    state: {
        menuOpened: false,
        blindActive: false,
        dialog: null,
    },
    mutations: {
        setMenuOpened( state, value ) {
            state.menuOpened = !!value;
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
    },
    actions: {

    },
};
