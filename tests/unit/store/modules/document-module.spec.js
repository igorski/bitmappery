import DocumentModule from "@/store/modules/document-module";
import GraphicFactory from "@/factories/graphic-factory";
import LayerFactory   from "@/factories/layer-factory";

const { getters, mutations } = DocumentModule;

let mockUpdateFn;
jest.mock("@/utils/canvas-util", () => ({
    flushSpritesInLayer: (...args) => mockUpdateFn?.( "flushSpritesInLayer", ...args ),
}));

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

        it( "should be able to retrieve the active Layer for the active Document", () => {
            const state = { activeLayerIndex: 1 };
            const mockedGetters = {
                layers: [ { name: "layer1" }, { name: "layer2" }, { name: "layer3" } ]
            };
            expect( getters.activeLayer( state, mockedGetters )).toEqual( mockedGetters.layers[ 1 ]);
        });

        it( "should be able to retrieve the active Layer index", () => {
            const state = { activeLayerIndex: 2 };
            expect( getters.activeLayerIndex( state )).toEqual( 2 );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the active Document index", () => {
            const state = { activeIndex: 0 };
            mutations.setActiveDocument( state, 2 );
            expect( state.activeIndex ).toEqual( 2 );
        });

        it( "should be able to update the active Document size", () => {
            const state = {
                documents: [
                    { name: "foo", width: 30, height: 30 },
                    { name: "bar", width: 50, height: 50 }
                ],
                activeIndex : 1,
            };
            const size = { width: 75, height: 40 };
            mutations.setActiveDocumentSize( state, size );
            expect( state.documents ).toEqual([
                { name: "foo", width: 30, height: 30 },
                { name: "bar", width: size.width, height: size.height },
            ]);
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
            const layer1 = LayerFactory.create();
            const layer2 = LayerFactory.create();
            const layer3 = LayerFactory.create();
            const state = {
                documents: [
                    { name: "foo", layers: [ layer1 ] },
                    { name: "bar", layers: [ layer2, layer3 ] }
                ],
                activeIndex: 1
            };
            mockUpdateFn = jest.fn();
            mutations.closeActiveDocument( state );
            expect( state.documents ).toEqual([ { name: "foo", layers: [ layer1 ] }]);
            expect( state.activeIndex ).toEqual( 0 );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "flushSpritesInLayer", layer2 );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "flushSpritesInLayer", layer3 );
        });

        describe( "when adding layers", () => {
            it( "should be able to add a Layer to the active Document", () => {
                const state = {
                    documents: [ { name: "foo", layers: [] } ],
                    activeIndex: 0
                };
                mutations.addLayer( state );
                expect( state.documents[ 0 ].layers ).toEqual([ LayerFactory.create() ]);
            });

            it( "should update the active layer index to the last added layers index", () => {
                const state = {
                    documents: [ { name: "foo", layers: [ { name: "layer1" }, { name: "layer2" } ] } ],
                    activeIndex: 0,
                    activeLayerIndex: 1
                };
                mutations.addLayer( state );
                expect( state.activeLayerIndex ).toEqual( 0 ); // is always 0 (newest == first)
            });

            it( "should add new layers at the beginning of the list (to have them appear on top)", () => {
                const state = {
                    documents: [ { name: "foo", layers: [{ name: "layer1" }] }],
                    activeIndex: 0
                };
                mutations.addLayer( state, "layer2" );
                expect( state.documents[ 0 ].layers ).toEqual([
                    LayerFactory.create( "layer2" ), { name: "layer1" }
                ]);
            });
        });

        it( "should be able to remove a layer by reference", () => {
            const state = {
                documents: [{
                    name: "foo",
                    layers: [ { name: "layer1" }, { name: "layer2" }, { name: "layer3" } ]
                }],
                activeIndex: 0,
            };
            mockUpdateFn = jest.fn();
            const layer = state.documents[ 0 ].layers[ 1 ];
            mutations.removeLayer( state, layer );
            expect( state.documents[ 0 ].layers ).toEqual([
                { name: "layer1" }, { name: "layer3" }
            ]);
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "flushSpritesInLayer", layer );
        });

        it( "should be able to set the active layer index", () => {
            const state = {
                documents: [ { name: "foo", layers: [{ name: "layer1" }, { name: "layer2" }] }],
                activeLayerIndex: 0
            };
            mutations.setActiveLayerIndex( state, 1 );
            expect( state.activeLayerIndex ).toEqual( 1 );
        });

        it( "should be able to add a Graphic to a specific layer within the active Document", () => {
            const state = {
                documents: [{
                    name: "foo",
                    layers: [ LayerFactory.create( "layer1" ), LayerFactory.create( "layer2" ) ]
                }],
                activeIndex: 0
            };
            const index  = 1;
            const bitmap = { name: "bar" };
            mutations.addGraphicToLayer( state, { index, bitmap });
            expect( state.documents[ 0 ].layers[ index ].graphics ).toEqual( expect.any( Object ));
        });
    });
});
