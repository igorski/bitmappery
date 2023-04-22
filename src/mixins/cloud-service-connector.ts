/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
import { mapState, mapMutations } from "vuex";
import { DROPBOX_FILE_SELECTOR, GOOGLE_DRIVE_FILE_SELECTOR, AWS_S3_FILE_SELECTOR } from "@/definitions/modal-windows";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import { getDropboxService, getGoogleDriveService, getS3Service } from "@/utils/cloud-service-loader";

let isAuthenticated: () => Promise<boolean>;
let requestLogin: ( clientId?: string, redirectUrl?: string ) => Promise<void>;
let registerAccessToken: ( token: string ) => void;
let init: () => void;
let validateScopes: ( scope: string ) => boolean;
let disconnect: () => void;
let loginWindow: Window;
let boundHandler: ( event: MessageEvent ) => void;

const PRIVACY_POLICY_URL = "https://www.igorski.nl/bitmappery/privacy";

/**
 * A mixin that provides a generic behaviour with regards to interacting with
 * third party storage providers. The init() methods open file browsers for the
 * respective storage provider, when authenticated. When not authenticated, the
 * respective login flow is presented.
 */
export default {
    data: () => ({
        initialized: false,
        authenticated: false,
        authUrl: "",
    }),
    computed: {
        ...mapState([
            "dropboxConnected",
        ]),
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "openModal",
            "setLoading",
            "unsetLoading",
            "showNotification",
        ]),
        openAuth( message: string, confirm: () => void, cancel = () => true ): void {
            this.openDialog({
                type: "confirm",
                title: this.$t( "cloud.establishConnection" ),
                link: {
                    href  : PRIVACY_POLICY_URL,
                    title : this.$t( "cloud.privacyPolicy" )
                },
                message,
                confirm,
                cancel,
            });
        },
        showConnectionMessage( storageType: STORAGE_TYPES ): void {
            let i18n;
            switch ( storageType ) {
                default:
                    return;
                case STORAGE_TYPES.DROPBOX:
                    i18n = "cloud.connectedToDropbox";
                    break;
                case STORAGE_TYPES.DRIVE:
                    i18n = "cloud.connectedToDrive";
                    break;
            }
            this.showNotification({ message: this.$t( i18n ) });
        },
        /* 1. Dropbox */
        async initDropbox( openFileBrowserOnSuccess = true ): Promise<void> {
            ({ isAuthenticated, requestLogin, registerAccessToken } = await getDropboxService() );

            const LOADING_KEY = "dbxc";
            this.setLoading( LOADING_KEY );
            this.authenticated = await isAuthenticated();
            this.unsetLoading( LOADING_KEY );

            if ( this.authenticated ) {
                if ( !this.dropboxConnected ) {
                    this.showConnectionMessage( STORAGE_TYPES.DROPBOX );
                }
                if ( openFileBrowserOnSuccess ) {
                    this.openFileBrowserDropbox();
                }
            } else {
                this.authUrl = await requestLogin();
                this.openAuth( this.$t( "cloud.connectionExplDropbox" ), this.loginDropbox.bind( this ));
            }
        },
        loginDropbox(): void {
            loginWindow  = window.open( this.authUrl );
            boundHandler = this.messageHandlerDropbox.bind( this );
            window.addEventListener( "message", boundHandler );
        },
        messageHandlerDropbox({ data }: MessageEvent ): void {
            if ( data?.accessToken ) {
                registerAccessToken( data.accessToken );
                window.removeEventListener( "message", boundHandler );
                loginWindow.close();
                loginWindow = null;
                this.showConnectionMessage( STORAGE_TYPES.DROPBOX );
                this.authenticated = true;
                this.openFileBrowserDropbox();
            }
        },
        openFileBrowserDropbox(): void {
            this.openModal( DROPBOX_FILE_SELECTOR );
        },
        /* 2. Google Drive */
        async initDrive( openFileBrowserOnSuccess = true ): Promise<void> {
            ({ init, requestLogin, validateScopes, disconnect, isAuthenticated, registerAccessToken } = await getGoogleDriveService() );

            const LOADING_KEY = "gdc";

            this.setLoading( LOADING_KEY );

            this.initialized = await init();
            this.unsetLoading( LOADING_KEY );

            if ( !this.initialized ) {
                this.openDialog({
                    type: "error",
                    message: this.$t( "cloud.errorLoadingDrive" )
                });
                return;
            }
            this.authenticated = await isAuthenticated();

            if ( this.authenticated ) {
                if ( !this.driveConnected ) {
                    this.showConnectionMessage( STORAGE_TYPES.DRIVE );
                }
                if ( openFileBrowserOnSuccess ) {
                    this.openFileBrowserDrive();
                }
            } else {
                this.openAuth(
                    this.$t( "cloud.connectionExplDrive" ),
                    this.loginDrive.bind( this ),
                    this.cancelLoginDrive.bind( this )
                );
            }
        },
        loginDrive(): void {
            requestLogin();
            boundHandler = this.messageHandlerDrive.bind( this );
            window.addEventListener( "message", boundHandler );
        },
        cancelLoginDrive(): void {
            this.initialized   = false;
            this.authenticated = false;
            window.removeEventListener( "message", boundHandler );
        },
        messageHandlerDrive({ data }: MessageEvent ): void {
            // if ux_mode was specified as redirect, the data is posted from our redirect URI as JSON
            let result = data;
            // if ux_mode was specified as popup, the data is posted from Google API as Stringified JSON
            if ( typeof data === "string" ) {
                try {
                    const { authResult } = JSON.parse( data ).params;
                    result = {
                        accessToken : authResult.access_token,
                        scope       : authResult.scope
                    };
                } catch {
                    // nowt...
                }
            }

            // note we use a slight timeout after logging in as the Google API's are loading
            const TIMEOUT = 2000;

            if ( result?.scope && !validateScopes( result.scope )) {
                this.cancelLoginDrive();
                this.openDialog({ type: "error", message: this.$t( "cloud.notAllPermissionsGrantedDrive" )});
                window.setTimeout( disconnect, TIMEOUT );
                return;
            }

            if ( result?.accessToken ) {
                registerAccessToken( result.accessToken );
                window.removeEventListener( "message", boundHandler );
                this.showConnectionMessage( STORAGE_TYPES.DRIVE );
                this.authenticated = true;
                window.setTimeout( this.openFileBrowserDrive.bind( this ), TIMEOUT );
            } else {
                this.cancelLoginDrive(); // user likely cancelled auth flow
            }
        },
        openFileBrowserDrive(): void {
            this.openModal( GOOGLE_DRIVE_FILE_SELECTOR );
        },
        // AWS S3
        async initS3( openFileBrowserOnSuccess = true ): Promise<void> {
            const s3 = await getS3Service();
            const connected = await s3.initS3();

            if ( connected ) {
                if ( openFileBrowserOnSuccess ) {
                    this.openFileBrowserS3();
                }
            } else {
                this.openDialog({
                    type: "error",
                    message: this.$t( "cloud.errorConnectingS3" )
                });
            }
        },
        openFileBrowserS3(): void {
            this.openModal( AWS_S3_FILE_SELECTOR );
        },
    },
};
