import Vue        from "vue";
import BitMappery from "./bitmappery.vue";
// igorski.nl maintains its own service worker registration, if your
// custom app requires PWA support, uncomment the following line
//import "./registerServiceWorker"

Vue.config.productionTip = false;

new Vue({
    render: h => h( BitMappery )
}).$mount( "#app" );
