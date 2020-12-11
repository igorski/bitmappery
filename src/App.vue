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
    <div id="app">
        <application-menu />
        <file-selector />
        <document-canvas />
        <!-- dialog window used for information messages, alerts and confirmations -->
        <dialog-window v-if="dialog"
            :type="dialog.type"
            :title="dialog.title"
            :message="dialog.message"
            :confirm-handler="dialog.confirm"
            :cancel-handler="dialog.cancel"
        />
    </div>
</template>

<script>
import Vue                from "vue";
import Vuex, { mapState } from "vuex";
import VueI18n            from "vue-i18n";
import ApplicationMenu    from "@/components/application-menu/application-menu";
import FileSelector       from "@/components/file-selector/file-selector";
import DocumentCanvas     from "@/components/document-canvas/document-canvas";
import DialogWindow       from "@/components/dialog-window/dialog-window";
import store              from "./store";
import messages           from "./messages.json";

Vue.use( Vuex );
Vue.use( VueI18n );

// Create VueI18n instance with options
const i18n = new VueI18n({
    messages
});

export default {
    i18n,
    store: new Vuex.Store( store ),
    components: {
        ApplicationMenu,
        FileSelector,
        DocumentCanvas,
        DialogWindow,
    },
    computed: {
        ...mapState([
            "dialog",
        ]),
    },
};
</script>

<style lang="scss">
/* note child components use scoped styling, here we set the global typography */
@import "@/styles/typography";

#app {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
</style>
