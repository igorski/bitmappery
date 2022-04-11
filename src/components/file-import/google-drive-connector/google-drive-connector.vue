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
<template>
    <div class="form">
        <template v-if="!initialized && !awaitingConnection">
            <button
                v-if="initialized"
                v-t="'loginToDrive'"
                type="button"
                class="button drive"
                @click="login()"
            ></button>
        </template>
        <template v-if="authenticated || awaitingConnection">
            <button
                v-t="authenticated ? 'importFromDrive' : 'connectingToDrive'"
                type="button"
                class="button drive"
                :disabled="awaitingConnection"
                @click="openFileBrowser()"
            ></button>
        </template>
    </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import { GOOGLE_DRIVE_FILE_SELECTOR } from "@/definitions/modal-windows";
import {
    init, requestLogin, validateScopes, disconnect, isAuthenticated, registerAccessToken
} from "@/services/google-drive-service";
import messages from "./messages.json";

let boundHandler;

export default {
    i18n: { messages },
    data: () => ({
        initialized: false,
        authenticated: false,
        loading: false,
    }),
    computed: {
        ...mapState([
            "driveConnected",
        ]),
        awaitingConnection() {
            return this.initialized && !this.authenticated;
        },
    },
    async created() {
        this.loading = true;

        const LOADING_KEY = "gdc";

        this.setLoading( LOADING_KEY );

        this.initialized = await init(
            window.driveApiKey   || localStorage?.getItem( "driveApiKey" ),
            window.driveClientId || localStorage?.getItem( "driveClientId" ),
            window.driveRedirect || `${window.location.href.split( "?" )[ 0 ]}login_drive.html`
        );
        this.unsetLoading( LOADING_KEY );

        if ( !this.initialized ) {
            this.openDialog({
                type: "error",
                message: this.$t( "errorLoadingAPI" )
            });
            return;
        }
        this.authenticated = await isAuthenticated();

        if ( this.authenticated ) {
            if ( !this.driveConnected ) {
                this.showConnectionMessage();
            }
            this.openFileBrowser();
        } else {
            this.openDialog({
                type: "confirm",
                title: this.$t( "establishConnection" ),
                message: this.$t( "connectionExpl" ),
                confirm: () => this.login(),
            });
        }
        this.loading = false;
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "openModal",
            "setLoading",
            "unsetLoading",
            "showNotification",
        ]),
        login() {
            requestLogin();
            boundHandler = this.messageHandler.bind( this );
            window.addEventListener( "message", boundHandler );
        },
        messageHandler({ data }) {
            // if ux_mode was specified as redirect, the data is posted from our redirect URI as JSON
            let result = data;
            // if ux_mode was specified as popup, the data is posted from Google API as Stringified JSON
            if ( typeof data === "string" ) {
                try {
                    const { authResult } = JSON.parse( data ).params;
                    result = {
                        accessToken : authResult.id_token,
                        scope       : authResult.scope
                    };
                } catch {}
            }

            // note we use a slight timeout after logging in as the Google API's are loading
            const TIMEOUT = 2000;

            if ( result?.scope && !validateScopes( result.scope )) {
                window.removeEventListener( "message", boundHandler );
                this.openDialog({ type: "error", message: this.$t( "notAllPermissionsGranted" )});
                window.setTimeout( disconnect, TIMEOUT );
                return;
            }
            if ( result?.accessToken ) {
                registerAccessToken( result.accessToken );
                window.removeEventListener( "message", boundHandler );
                this.showConnectionMessage();
                this.authenticated = true;
                window.setTimeout( this.openFileBrowser.bind( this ), TIMEOUT );
            }
        },
        openFileBrowser() {
            this.openModal( GOOGLE_DRIVE_FILE_SELECTOR );
        },
        showConnectionMessage() {
            this.showNotification({ message: this.$t( "connectedToDrive" ) });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/third-party";
</style>
