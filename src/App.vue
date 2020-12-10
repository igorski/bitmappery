<template>
    <div id="app">
        <h1 v-t="'nicephore'"></h1>
        <file-selector />
        <canvas />
    </div>
</template>

<script>
import Vue from 'vue';
import VueI18n from 'vue-i18n';
import FileSelector from '@/components/file-selector/file-selector';
import Canvas from '@/components/canvas/canvas';
import messages from './messages.json';

Vue.use( VueI18n );

// Create VueI18n instance with options
const i18n = new VueI18n({
    messages
});

export default {
    i18n,
    components: {
        FileSelector,
        Canvas,
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
