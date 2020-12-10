import Vue from 'vue';
import App from './App.vue';
// igorski.nl maintains its own service worker registration, if your
// custom app requires PWA support, uncomment the following line
//import './registerServiceWorker'

Vue.config.productionTip = false;

new Vue({
    render: h => h( App )
}).$mount( '#app' );
