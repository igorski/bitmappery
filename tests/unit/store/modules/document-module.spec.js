import DocumentModule  from "@/store/modules/document-module";
import { LAYER_IMAGE } from "@/definitions/layer-types";

const { getters, mutations } = DocumentModule;

let mockUpdateFn;
jest.mock( "@/factories/sprite-factory", () => ({
    flushLayerSprites: (...args) => mockUpdateFn?.( "flushLayerSprites", ...args ),
    runSpriteFn: (...args) => mockUpdateFn?.( "runSpriteFn", ...args ),
    getSpriteForLayer: (...args) => mockUpdateFn?.( "getSpriteForLayer", ...args ),
    getCanvasInstance: (...args) => mockUpdateFn?.( "getCanvasInstance", ...args ),
}));
jest.mock( "@/factories/layer-factory", () => ({
    create: (...args) => mockUpdateFn?.( "create", ...args ),
}));
jest.mock( "@/utils/render-util", () => ({
    resizeLayerContent: (...args) => mockUpdateFn?.( "resizeLayerContent", ...args ),
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

        it( "should be able to retrieve the active Layer index", () => {
            const state = { activeLayerIndex: 2 };
            expect( getters.activeLayerIndex( state )).toEqual( 2 );
        });

        it( "should be able to retrieve the active Layer for the active Document", () => {
            const state = { activeLayerIndex: 1 };
            const mockedGetters = {
                layers: [ { name: "layer1" }, { name: "layer2" }, { name: "layer3" } ]
            };
            expect( getters.activeLayer( state, mockedGetters )).toEqual( mockedGetters.layers[ 1 ]);
        });

        it( "should be able to retrieve the active Layer mask, when set", () => {
            const state = { maskActive: false };
            const mockedGetters = { activeLayer: { name: "layer1" } };
            // null because mask is not active
            expect( getters.activeLayerMask( state, mockedGetters )).toBeNull();
            state.maskActive = true;
            // null because layer has no mask drawable
            expect( getters.activeLayerMask( state, mockedGetters )).toBeNull();
            mockedGetters.activeLayer.mask = { src: "mask" };
            expect( getters.activeLayerMask( state, mockedGetters )).toEqual( mockedGetters.activeLayer.mask );
        });

        it( "should be able to retrieve the active Layer effects", () => {
            const mockedGetters = { activeLayer: { name: "layer1", effects: [{ rotation: 1 }] } };
            expect( getters.activeLayerEffects( {}, mockedGetters )).toEqual( mockedGetters.activeLayer.effects );
        });
    });

    describe( "mutations", () => {
        describe( "when setting the active Document", () => {
            it( "should be able to set the active Document index", () => {
                const state = {
                    documents: [{ name: "foo" }, { name: "bar" }],
                    activeIndex: 0
                };
                mutations.setActiveDocument( state, 1 );
                expect( state.activeIndex ).toEqual( 1 );
            });

            it( "should request the invalidate() method on each Sprite for the given Document", () => {
                const state = {
                    documents: [{ name: "foo" }, { name: "bar" }],
                    activeIndex: 0
                };
                mockUpdateFn = jest.fn();
                mutations.setActiveDocument( state, 1 );
                expect( mockUpdateFn ).toHaveBeenCalledWith( "runSpriteFn", expect.any( Function ), state.documents[ 1 ]);
            });
        });

        it( "should be able to update the active Document name", () => {
            const state = {
                documents: [ { name: "foo", width: 5, height: 5 }, { name: "bar", width: 10, height: 10 }],
                activeIndex: 1,
            };
            mutations.setActiveDocumentName( state, "baz" );
            expect( state.documents ).toEqual([
                { name: "foo", width: 5, height: 5 }, { name: "baz", width: 10, height: 10 },
            ]);
        });

        describe( "when setting the active Document size", () => {
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

            it( "should update the existing zCanvas dimensions and trigger its associated rescale handler", () => {
                const state = {
                    documents: [
                        { name: "foo", width: 30, height: 30, layers: [ { name: "layer1", width: 30, height: 30 } ] },
                        { name: "bar", width: 50, height: 50, layers: [ { name: "layer2", width: 20, height: 10 }, { name: "layer3", width: 15, height: 15 } ] }
                    ],
                    activeIndex : 1,
                };
                const size = { width: 75, height: 40 };
                const mockCanvas = {
                    setDimensions: jest.fn(),
                    rescaleFn: jest.fn()
                };
                mockUpdateFn = jest.fn( fn => {
                    return fn === "getCanvasInstance" ? mockCanvas : null
                });
                mutations.setActiveDocumentSize( state, size );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "getCanvasInstance" );
                expect( mockCanvas.setDimensions ).toHaveBeenCalledWith( size.width, size.height, true, true );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "getCanvasInstance" );
                expect( mockCanvas.rescaleFn ).toHaveBeenCalled();
            });
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
            const layer1 = { name: "layer1" };
            const layer2 = { name: "layer2" };
            const layer3 = { name: "layer3" };
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
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "flushLayerSprites", layer2 );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "flushLayerSprites", layer3 );
        });

        describe( "when adding layers", () => {
            it( "should be able to add a Layer to the active Document", () => {
                const state = {
                    documents: [ { name: "foo", width: 1000, height: 1000, layers: [] } ],
                    activeIndex: 0
                };
                mockUpdateFn = jest.fn((fn, data) => data );
                const opts = { name: "layer1", width: 50, height: 100 };
                mutations.addLayer( state, opts );
                // assert LayerFactory is invoked with provided opts when calling addLayer()
                expect( mockUpdateFn ).toHaveBeenCalledWith( "create", opts );
                expect( state.documents[ 0 ].layers ).toEqual([{
                    name: "layer1",
                    width: 50,
                    height: 100
                } ]);
            });

            it( "when adding a Layer without specified dimensions, these should default to the Document dimensions", () => {
                const state = {
                    documents: [ { name: "foo", width: 1000, height: 1000, layers: [] } ],
                    activeIndex: 0
                };
                mockUpdateFn = jest.fn((fn, data) => data );
                const opts = { name: "layer1" };
                mutations.addLayer( state, opts );
                expect( state.documents[ 0 ].layers ).toEqual([{
                    name: "layer1",
                    width: state.documents[ 0 ].width,
                    height: state.documents[ 0 ].height
                }]);
            });

            it( "should update the active layer index to the last added layers index", () => {
                const state = {
                    documents: [ { name: "foo", layers: [ { name: "layer1" }, { name: "layer2" } ] } ],
                    activeIndex: 0,
                    activeLayerIndex: 1
                };
                mutations.addLayer( state );
                expect( state.activeLayerIndex ).toEqual( 2 );
            });

            it( "should add new layers at the end of the list (to have them appear on top)", () => {
                const state = {
                    documents: [ { name: "foo", layers: [{ name: "layer1" }] }],
                    activeIndex: 0
                };
                mutations.addLayer( state, { name: "layer2" });
                expect( state.documents[ 0 ].layers ).toEqual([
                    { name: "layer1" }, expect.any( Object )
                ]);
            });
        });

        describe( "when removing layers", () => {
            it( "should be able to remove a layer by reference", () => {
                const state = {
                    documents: [{
                        name: "foo",
                        layers: [ { name: "layer1" }, { name: "layer2" }, { name: "layer3" } ]
                    }],
                    activeIndex: 0,
                    activeLayerIndex: 1,
                };
                mockUpdateFn = jest.fn();
                const layer = state.documents[ 0 ].layers[ 1 ];
                mutations.removeLayer( state, 1 );
                expect( state.documents[ 0 ].layers ).toEqual([
                    { name: "layer1" }, { name: "layer3" }
                ]);
                expect( state.activeLayerIndex ).toEqual( 0 );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "flushLayerSprites", layer );
            });
        });

        describe( "when setting the active layer content", () => {
            it( "should be able to set the active layer by index", () => {
                const state = {
                    documents: [ { name: "foo", layers: [{ name: "layer1" }, { name: "layer2" }] }],
                    activeIndex: 0,
                    activeLayerIndex: 0
                };
                mutations.setActiveLayerIndex( state, 1 );
                expect( state.activeLayerIndex ).toEqual( 1 );
            });

            it( "should be able to set the active layer by reference", () => {
                const state = {
                    documents: [ { name: "foo", layers: [{ name: "layer1" }, { name: "layer2" }] }],
                    activeIndex: 0,
                    activeLayerIndex: 0
                };
                mutations.setActiveLayer( state, state.documents[ 0 ].layers[ 1 ] );
                expect( state.activeLayerIndex ).toEqual( 1 );
            });

            it( "should unset the active layer mask when setting the active layer index", () => {
                const state = {
                    documents: [ { name: "foo", layers: [{ name: "layer1" }, { name: "layer2" }] }],
                    activeLayerIndex: 0,
                    maskActive: true,
                };
                mutations.setActiveLayerIndex( state, 1 );
                expect( state.maskActive ).toBe( false );
            });

            it( "should be able to set the active layer mask", () => {
                const state = {
                    documents: [{
                        name: "foo",
                        layers: [ { name: "layer1" }, { name: "layer2", mask: { src: "mask" } } ]
                    }],
                    activeIndex: 0,
                    activeLayerIndex: 0,
                    maskActive: false,
                };
                mutations.setActiveLayerMask( state, 1 );
                expect( state.activeLayerIndex ).toEqual( 1 );
                expect( state.maskActive ).toBe( true );
            });
        });

        describe( "when updating layer properties", () => {
            let layer1, layer2, state;
            beforeEach(() => {
                layer1 = { name: "layer1", effects: { rotation: 0 } };
                layer2 = { name: "layer2", effects: { rotation: 0 } };
                state = {
                    documents: [{
                        name: "foo",
                        layers: [ { ...layer1 }, { ...layer2 } ]
                    }],
                    activeIndex: 0
                };
            });

            it( "should be able to update the options of a specific layer within the active Document", () => {
                const index = 1;
                const opts  = {
                    name: "layer2 updated",
                    x: 100,
                    y: 200,
                    source: new Image(),
                    width: 100,
                    height: 150,
                    type: LAYER_IMAGE
                };
                const mockSprite = { src: "bitmap", cacheEffects: jest.fn() };
                mockUpdateFn = jest.fn( fn => {
                    if ( fn === "getSpriteForLayer" ) return mockSprite;
                    return true;
                });
                mutations.updateLayer( state, { index, opts });
                expect( state.documents[ 0 ].layers[ index ] ).toEqual({
                    ...layer2,
                    ...opts
                });
                expect( mockUpdateFn ).toHaveBeenCalledWith( "getSpriteForLayer", state.documents[ 0 ].layers[ index ] );
                expect( mockSprite.cacheEffects ).toHaveBeenCalled();
            });

            it( "should be able to update the effects of a specific layer within the active Document", () => {
                const index   = 0;
                const effects = { rotation: 1.6 };
                const mockSprite = { src: "bitmap", cacheEffects: jest.fn() };
                mockUpdateFn = jest.fn( fn => {
                    if ( fn === "getSpriteForLayer" ) return mockSprite;
                    return true;
                });
                mutations.updateLayerEffects( state, { index, effects });
                expect( state.documents[ 0 ].layers[ index ] ).toEqual({
                    ...layer1,
                    effects,
                });
                expect( mockUpdateFn ).toHaveBeenCalledWith( "getSpriteForLayer", state.documents[ 0 ].layers[ index ] );
                expect( mockSprite.cacheEffects ).toHaveBeenCalled();
            });
        });

        it( "should be able to resize active Document content by calling the render util upon each Layer", async () => {
            const layer1 = { name: "layer1" };
            const layer2 = { name: "layer2" };
            const state = {
                documents: [
                    { layers: [ layer1, layer2 ]}
                ],
                activeIndex: 0,
            };
            mockUpdateFn = jest.fn();
            const scaleX = 1.1;
            const scaleY = 1.2;
            await mutations.resizeActiveDocumentContent( state, { scaleX, scaleY });
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "resizeLayerContent", layer1, scaleX, scaleY );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "resizeLayerContent", layer2, scaleX, scaleY );
        });
    });
});
