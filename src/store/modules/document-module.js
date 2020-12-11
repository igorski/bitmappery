import DocumentFactory from "@/factories/document-factory";
import LayerFactory    from "@/factories/layer-factory";
import GraphicFactory  from "@/factories/graphic-factory";

export default {
    state: {
        documents : [ DocumentFactory.create() ],
        activeIndex: 0,
    },
    getters: {
        activeDocument: state => state.documents[ state.activeIndex ],
        layers: ( state, getters ) => getters.activeDocument.layers,
    },
    mutations: {
        setActiveDocument( state, index ) {
            state.activeIndex = index;
        },
        addLayer( state ) {
            state.documents[ state.activeIndex ].layers.push( LayerFactory.create() );
        },
        addGraphicToLayer( state, { index, bitmap }) {
            state.documents[ state.activeIndex ].layers[ index ]?.graphics.push(
                GraphicFactory.create( bitmap )
            );
        },
    },
    actions: {

    }
}
