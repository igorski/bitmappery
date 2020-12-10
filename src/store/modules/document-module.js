import Vue from 'vue';
import DocumentFactory from '@/factories/document-factory';
import LayerFactory    from '@/factories/layer-factory';
import GraphicFactory  from '@/factories/graphic-factory';

export default {
    state: {
        document: DocumentFactory.create(),
    },
    getters: {
        document: state => state.document,
        layers: state => state.document.layers,
    },
    mutations: {
        addLayer( state ) {
            state.document.layers.push( LayerFactory.create() );
        },
        addGraphicToLayer( state, { index, bitmap }) {
            state.document.layers[ index ]?.graphics.push( GraphicFactory.create( bitmap ));
        },
    },
    actions: {

    }
}
