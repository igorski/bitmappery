import DocumentModule from "@/store/modules/document-module";
import GraphicFactory from "@/factories/graphic-factory";
import LayerFactory   from "@/factories/layer-factory";

const { getters, mutations } = DocumentModule;

describe( "Vuex document module", () => {
    describe( "getters", () => {
        it( "should be able to retrieve all open Documents", () => {
            const state = { documents: [ { name: "foo" }, { name: "bar" } ] };
            expect( getters.documents( state )).toEqual( state.documents );
        });

        it( "should be able to retrieve the active Document", () => {
            const state = {
                documents: [ { name: "foo" }, { name: "bar" } ],
                activeIndex: 0
            };
            expect( getters.activeDocument( state )).toEqual( state.documents[ 0 ]);
            state.activeIndex = 1;
            expect( getters.activeDocument( state )).toEqual( state.documents[ 1 ]);
        });

        it( "should be able to retrieve the Layers for the active Document", () => {
            const state = {};
            const mockedGetters = {
                activeDocument: { layers: [ { name: "foo" }, { name: "bar" } ] },
            };
            expect( getters.layers( state, mockedGetters )).toEqual( mockedGetters.activeDocument.layers );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the active Document index", () => {
            const state = { activeIndex: 0 };
            mutations.setActiveDocument( state, 2 );
            expect( state.activeIndex ).toEqual( 2 );
        });

        it( "should be able to add a new Document to the list", () => {
            const state = {
                documents: [ { name: "foo" } ],
            };
            mutations.addNewDocument( state, "bar" );
            expect( state.documents ).toHaveLength( 2 );
            expect( state.documents[ 1 ].name ).toEqual( "bar" );
        });

        it( "should be able to close the active Document", () => {
            const state = {
                documents: [ { name: "foo" }, { name: "bar" } ],
                activeIndex: 1
            };
            mutations.closeActiveDocument( state );
            expect( state.documents ).toEqual([ { name: "foo" }]);
            expect( state.activeIndex ).toEqual( 0 );
        });

        it( "it should be able to add a Layer to the active Document", () => {
            const state = {
                documents: [ { name: "foo", layers: [] } ],
                activeIndex: 0
            };
            mutations.addLayer( state );
            expect( state.documents[ 0 ].layers ).toEqual([ LayerFactory.create() ]);
        });

        it( "it should be able to add a Graphic to a specific layer within the active Document", () => {
            const state = {
                documents: [{
                    name: "foo",
                    layers: [ LayerFactory.create( "Layer 1" ), LayerFactory.create( "Layer 2" ) ]
                }],
                activeIndex: 0
            };
            const index  = 1;
            const bitmap = { name: "bar" };
            mutations.addGraphicToLayer( state, { index, bitmap });
            expect( state.documents[ 0 ].layers[ index ].graphics ).toEqual([
                GraphicFactory.create( bitmap )
            ]);
        });
    });
});
