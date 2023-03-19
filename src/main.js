import Vue        from "vue";
import BitMappery from "./bitmappery.vue";
// igorski.nl maintains its own service worker registration, if your
// custom app requires PWA support, uncomment the following line
//import "./registerServiceWorker"

Vue.config.productionTip = false;

// required for psd.js
import { Buffer } from "buffer";
globalThis.Buffer = Buffer;

new Vue({
    render: h => h( BitMappery )
}).$mount( "#app" );
