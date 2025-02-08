import { Buffer } from "buffer";
import FloatingVue, { vTooltip } from "floating-vue";
import * as Vue from "vue";
import { createStore } from "vuex";
import { createI18n } from "vue-i18n";
import BitMappery from "./bitmappery.vue";
import messages from "./messages.json";
import store from "./store";

FloatingVue.options.themes.tooltip.delay.show = 500;
import "floating-vue/dist/style.css"; // required for tooltips

// required for psd.js
globalThis.Buffer = Buffer;

// Create VueI18n instance with options
const i18n = createI18n({
    legacy: true, // Options API
    messages
});

const app = Vue.createApp( BitMappery );
app.use( createStore( store ));
app.use( i18n );
app.directive( "tooltip", vTooltip );
app.mount( "#app" );
