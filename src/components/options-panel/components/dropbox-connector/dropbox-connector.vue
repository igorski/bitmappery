/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
        <template v-if="!authenticated">
            <button
                v-if="authUrl"
                v-t="'loginToDropbox'"
                type="button"
                class="button dropbox"
                @click="login"
            ></button>
        </template>
        <template v-if="authenticated || awaitingConnection">
            <button
                v-t="authenticated ? 'importFromDropbox' : 'connectingToDropbox'"
                type="button"
                class="button dropbox"
                :disabled="awaitingConnection"
                @click="openFileBrowser"
            ></button>
        </template>
    </div>
</template>

<script>
import { mapMutations } from "vuex";
import { DROPBOX_FILE_SELECTOR } from "@/definitions/modal-windows";
import {
    isAuthenticated, requestLogin, registerAccessToken
} from "@/services/dropbox-service";
import messages from "./messages.json";

let loginWindow, boundHandler;

export default {
    i18n: { messages },
    data: () => ({
        authenticated: false,
        loading: false,
        authUrl: "",
    }),
    computed: {
        awaitingConnection() {
            return !this.isauthenticated && !this.authUrl;
        },
    },
    async created() {
        this.loading = true;
        this.authenticated = await isAuthenticated();
        if ( this.authenticated ) {
            this.showConnectionMessage();
            this.openFileBrowser();
        } else {
            this.authUrl = requestLogin(
                window.dropboxClientId || localStorage?.getItem( "dropboxClientId" ),
                window.dropboxRedirect || `${window.location.href}login.html`
            );
        }
        this.loading = false;
    },
    methods: {
        ...mapMutations([
            "openModal",
            "showNotification",
        ]),
        login() {
            loginWindow  = window.open( this.authUrl );
            boundHandler = this.messageHandler.bind( this );
            window.addEventListener( "message", boundHandler );
        },
        messageHandler({ data }) {
            if ( data?.accessToken ) {
                registerAccessToken( data.accessToken );
                window.removeEventListener( "message", boundHandler );
                loginWindow.close();
                loginWindow = null;
                this.showConnectionMessage();
                this.authenticated = true;
                this.openFileBrowser();
            }
        },
        openFileBrowser() {
            this.openModal( DROPBOX_FILE_SELECTOR );
        },
        showConnectionMessage() {
            this.showNotification({ message: this.$t( "connectedToDropbox" ) });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/third-party";
</style>
