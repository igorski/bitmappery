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
        <button
            v-if="!initialized && !authenticated"
            v-t="'loginToDrive'"
            type="button"
            class="button drive"
            @click="loginDrive()"
        ></button>
        <button
            v-if="authenticated || awaitingConnection"
            v-t="authenticated ? 'importFromDrive' : 'connectingToDrive'"
            type="button"
            class="button drive"
            :disabled="awaitingConnection"
            @click="openFileBrowserDrive()"
        ></button>
    </div>
</template>

<script>
import CloudServiceConnector from "@/mixins/cloud-service-connector";
import sharedMessages from "@/messages.json"; // for CloudServiceConnector
import messages from "./messages.json";

let init, requestLogin, validateScopes, disconnect, isAuthenticated, registerAccessToken;
let boundHandler;

export default {
    i18n: { messages, sharedMessages },
    mixins: [ CloudServiceConnector ],
    data: () => ({
        loading: true,
    }),
    computed: {
        awaitingConnection() {
            return this.initialized && !this.authenticated;
        },
    },
    async created() {
        this.loading = true;
        await this.initDrive();
        this.loading = false;
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/third-party";
</style>
