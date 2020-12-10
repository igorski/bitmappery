<template>
    <div id="app">
        <h1 v-t="'nicephore'"></h1>
        <file-selector />
        <document-canvas />
    </div>
</template>

<script>
import Vue            from "vue";
import Vuex           from "vuex";
import VueI18n        from "vue-i18n";
import FileSelector   from "@/components/file-selector/file-selector";
import DocumentCanvas from "@/components/document-canvas/document-canvas";
import store          from "./store";
import messages       from "./messages.json";

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
        FileSelector,
        DocumentCanvas,
    },
};
</script>

<style lang="scss">

#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

</style>
