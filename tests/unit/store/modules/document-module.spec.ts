import { it, describe, expect, vi, beforeEach, afterAll } from "vitest";
import { type Layer } from "@/definitions/document";
import { LayerTypes } from "@/definitions/layer-types";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory, { type LayerProps } from "@/factories/layer-factory";
import DocumentModule, { createDocumentState, type DocumentState } from "@/store/modules/document-module";
import { mockZCanvas, createMockCanvasElement } from "../../mocks";

const { getters, mutations } = DocumentModule;

mockZCanvas();

let mockUpdateFn: ( fnName: string, ...args: any[]) => void;
vi.mock( "@/factories/sprite-factory", () => ({
    flushLayerSprites: (...args: any[]) => mockUpdateFn?.( "flushLayerSprites", ...args ),
    runSpriteFn: (...args: any[]) => mockUpdateFn?.( "runSpriteFn", ...args ),
    getSpriteForLayer: (...args: any[]) => mockUpdateFn?.( "getSpriteForLayer", ...args ),
    getCanvasInstance: (...args: any[]) => mockUpdateFn?.( "getCanvasInstance", ...args ),
}));
vi.mock( "@/utils/render-util", () => ({
    resizeLayerContent: (...args: any[]) => mockUpdateFn?.( "resizeLayerContent", ...args ),
    cropLayerContent: (...args: any[]) => mockUpdateFn?.( "cropLayerContent", ...args ),
}));

describe( "Vuex document module", () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    describe( "getters", () => {
        it( "should be able to retrieve all open Documents", () => {
            const state = createDocumentState({
                documents: [
                    DocumentFactory.create({ name: "foo" }),
                    DocumentFactory.create({ name: "bar" })
                ]
            });
            expect( getters.documents( state, getters, {}, {} )).toEqual( state.documents );
        });

        it( "should be able to retrieve the active Document", () => {
            const state = createDocumentState({
                documents: [
                    DocumentFactory.create({ name: "foo" }),
                    DocumentFactory.create({ name: "bar" })
                ],
                activeIndex: 0
            });
            expect( getters.activeDocument( state, getters, {}, {} )).toEqual( state.documents[ 0 ]);
            state.activeIndex = 1;
            expect( getters.activeDocument( state, getters, {}, {} )).toEqual( state.documents[ 1 ]);
        });

        it( "should be able to retrieve the Layers for the active Document", () => {
            const state = createDocumentState({
                documents: [
                    DocumentFactory.create({
                        name: "foo",
                        layers: [
                            LayerFactory.create({ name: "foo" }),
                            LayerFactory.create({ name: "bar" })
                        ]
                    })
                ],
                activeIndex: 0
            });
            expect( getters.layers( state, getters, {}, {} )).toEqual( state.documents[ 0 ].layers );
        });

        it( "should be able to retrieve the active Layer index", () => {
            const state = createDocumentState({ activeLayerIndex: 2 });
            expect( getters.activeLayerIndex( state, getters, {}, {} )).toEqual( 2 );
        });

        it( "should be able to retrieve the active Layer for the active Document", () => {
            const state = createDocumentState({ activeLayerIndex: 1 });
            const mockedGetters = {
                layers: [
                    LayerFactory.create({ name: "layer1" }),
                    LayerFactory.create({ name: "layer2" }),
                    LayerFactory.create({ name: "layer3" })
                ]
            };
            expect( getters.activeLayer( state, mockedGetters, {}, {} )).toEqual( mockedGetters.layers[ 1 ]);
        });

        it( "should be able to retrieve the active Layer mask, when set", () => {
            const state = createDocumentState({ maskActive: false });
            const mockedGetters = {
                activeLayer: LayerFactory.create({ name: "layer1" }),
            };
            // null because mask is not active
            expect( getters.activeLayerMask( state, mockedGetters, {}, {} )).toBeNull();
            state.maskActive = true;
            // null because layer has no mask drawable
            expect( getters.activeLayerMask( state, mockedGetters, {}, {} )).toBeNull();
            mockedGetters.activeLayer.mask = createMockCanvasElement();
            expect( getters.activeLayerMask( state, mockedGetters, {}, {} )).toEqual( mockedGetters.activeLayer.mask );
        });

        it( "should be able to retrieve the active Layer effects", () => {
            const mockedGetters = { activeLayer: { name: "layer1", effects: [{ rotation: 1 }] } };
            expect( getters.activeLayerEffects( createDocumentState(), mockedGetters, {}, {} )).toEqual( mockedGetters.activeLayer.effects );
        });

        it( "should know whether the current Document has an active selection", () => {
            const mockedGetters = { activeDocument: DocumentFactory.create({ activeSelection: [] }) };
            expect( getters.hasSelection( createDocumentState(), mockedGetters, {}, {} )).toBe( false );

            mockedGetters.activeDocument.activeSelection = [ [] ];
            expect( getters.hasSelection( createDocumentState(), mockedGetters, {}, {} )).toBe( false );

            mockedGetters.activeDocument.activeSelection = [[ { x: 0, y: 0 }] ];
            expect( getters.hasSelection( createDocumentState(), mockedGetters, {}, {} )).toBe( true );
        });
    });

    describe( "mutations", () => {
        describe( "when setting the active Document", () => {
            it( "should be able to set the active Document index", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({ name: "foo", layers: [ LayerFactory.create(), LayerFactory.create() ] }),
                        DocumentFactory.create({ name: "bar", layers: [ LayerFactory.create(), LayerFactory.create(), LayerFactory.create()] })
                    ],
                    activeIndex: 0,
                    activeLayerIndex: 1,
                });
                mutations.setActiveDocument( state, 1 );
                expect( state.activeIndex ).toEqual( 1 );
                expect( state.activeLayerIndex ).toEqual( 1 );
            });

            it( "when switching to a Document with less layers than the currently active one, it should select the top layer", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({ name: "foo", layers: [ LayerFactory.create(), LayerFactory.create() ] }),
                        DocumentFactory.create({ name: "bar", layers: [ LayerFactory.create(), LayerFactory.create(), LayerFactory.create() ] })
                    ],
                    activeIndex: 1,
                    activeLayerIndex: 2,
                });
                mutations.setActiveDocument( state, 0 );
                expect( state.activeIndex ).toEqual( 0 );
                expect( state.activeLayerIndex ).toEqual( 1 );
            });

            it( "should request the invalidate() method on each Sprite for the given Document", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({ name: "foo" }),
                        DocumentFactory.create({ name: "bar" })
                    ],
                    activeIndex: 0
                });
                mockUpdateFn = vi.fn();
                mutations.setActiveDocument( state, 1 );
                expect( mockUpdateFn ).toHaveBeenCalledWith( "runSpriteFn", expect.any( Function ), state.documents[ 1 ]);
            });
        });

        it( "should be able to update the active Document name", () => {
            const state = createDocumentState({
                documents: [
                    DocumentFactory.create({ name: "foo", width: 5, height: 5 }),
                    DocumentFactory.create({ name: "bar", width: 10, height: 10 })
                ],
                activeIndex: 1,
            });
            const [ document1, document2 ] = state.documents;

            mutations.setActiveDocumentName( state, "baz" );

            expect( state.documents ).toEqual([
                document1, {
                    ...document2,
                    name: "baz",
                }
            ]);
        });

        describe( "when setting the active Document size", () => {
            it( "should be able to update the active Document size", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({ name: "foo", width: 30, height: 30 }),
                        DocumentFactory.create({ name: "bar", width: 50, height: 50 }),
                    ],
                    activeIndex : 1,
                });
                const size = { width: 75, height: 40 };
                mutations.setActiveDocumentSize( state, size );
                expect( state.documents ).toEqual([
                    { name: "foo", width: 30, height: 30 },
                    { name: "bar", width: size.width, height: size.height },
                ]);
            });

            it( "should update the existing zCanvas dimensions and trigger its associated rescale handler", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({ name: "foo", width: 30, height: 30, layers: [ LayerFactory.create({ name: "layer1", width: 30, height: 30 }) ] }),
                        DocumentFactory.create({ name: "bar", width: 50, height: 50, layers: [ LayerFactory.create({ name: "layer2", width: 20, height: 10 }), LayerFactory.create({ name: "layer3", width: 15, height: 15 }) ] }),
                    ],
                    activeIndex : 1,
                });
                const size = { width: 75, height: 40 };
                const mockCanvas = {
                    setDimensions: vi.fn(),
                    rescaleFn: vi.fn(),
                    refreshFn: vi.fn(),
                };
                mockUpdateFn = vi.fn( fn => {
                    return fn === "getCanvasInstance" ? mockCanvas : null
                });
                mutations.setActiveDocumentSize( state, size );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "getCanvasInstance" );
                expect( mockCanvas.setDimensions ).toHaveBeenCalledWith( size.width, size.height, true, true );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "getCanvasInstance" );
                expect( mockCanvas.rescaleFn ).toHaveBeenCalled();
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "getCanvasInstance" );
                expect( mockCanvas.refreshFn ).toHaveBeenCalled();
            });
        });

        it( "should be able to set the active selection for the currently active document", () => {
            const selection = [{ x: 0, y: 0 }, { x: 10, y: 10 }];

            const state = createDocumentState({
                documents: [
                    DocumentFactory.create({ name: "foo", activeSelection: [] }),
                    DocumentFactory.create({ name: "bar", activeSelection: [] })
                ],
                activeIndex: 1
            });
            mutations.setActiveSelection( state, selection );

            expect( state.documents[ 0 ].activeSelection ).toHaveLength( 0 );
            expect( state.documents[ 1 ].activeSelection ).toEqual( selection );
        });

        it( "should be able to add a new Document to the list", () => {
            const state = createDocumentState({
                documents: [ DocumentFactory.create({ name: "foo" }) ],
                activeIndex: 0,
                activeLayerIndex: 2,
            });
            mutations.addNewDocument( state, "bar" );
            expect( state.documents ).toHaveLength( 2 );
            expect( state.documents[ 1 ].name ).toEqual( "bar" );
            expect( state.activeIndex ).toEqual( 1 );
            expect( state.activeLayerIndex ).toEqual( 0 );
        });

        it( "should be able to close the active Document", () => {
            const layer1 = LayerFactory.create({ name: "layer1" });
            const layer2 = LayerFactory.create({ name: "layer2" });
            const layer3 = LayerFactory.create({ name: "layer3" });

            const state = createDocumentState({
                documents: [
                    DocumentFactory.create({ name: "foo", layers: [ layer1 ] }),
                    DocumentFactory.create({ name: "bar", layers: [ layer2, layer3 ] }),
                ],
                activeIndex: 1
            });
            mockUpdateFn = vi.fn();
            mutations.closeActiveDocument( state );
            expect( state.documents ).toEqual([ { name: "foo", layers: [ layer1 ] }]);
            expect( state.activeIndex ).toEqual( 0 );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "flushLayerSprites", layer2 );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "flushLayerSprites", layer3 );
        });

        describe( "when adding layers", () => {
            const layerCreateMock = vi.spyOn( LayerFactory, "create" ).mockImplementation(( args: LayerProps ) => args as Layer );

            it( "should be able to add a Layer to the active Document", () => {
                const state = createDocumentState({
                    documents: [ DocumentFactory.create({ name: "foo", width: 1000, height: 1000, layers: [] }) ],
                    activeIndex: 0
                });

                const layerOpts = { name: "layer1", width: 50, height: 100 };
                mutations.addLayer( state, layerOpts );

                // assert LayerFactory is invoked with provided opts when calling addLayer()
                expect( layerCreateMock ).toHaveBeenCalledWith( layerOpts );
                expect( state.documents[ 0 ].layers ).toEqual([{
                    name: "layer1",
                    width: 50,
                    height: 100
                } ]);
            });

            it( "when adding a Layer without specified dimensions, these should default to the Document dimensions", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({ name: "foo", width: 1000, height: 1000, layers: [] })
                    ],
                    activeIndex: 0
                });
                mockUpdateFn = vi.fn((_fn, data) => data );
                
                const layerOpts = { name: "layer1" };
                mutations.addLayer( state, layerOpts );

                expect( state.documents[ 0 ].layers ).toEqual([{
                    name: layerOpts.name,
                    width: state.documents[ 0 ].width,
                    height: state.documents[ 0 ].height
                }]);
            });

            it( "should update the active layer index to the last added layers index", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({
                            name: "foo",
                            layers: [
                                LayerFactory.create({ name: "layer1" }),
                                LayerFactory.create({ name: "layer2" })
                            ]
                        })
                    ],
                    activeIndex: 0,
                    activeLayerIndex: 1
                });
                mutations.addLayer( state );
                expect( state.activeLayerIndex ).toEqual( 2 );
            });

            it( "should add new layers at the end of the list (to have them appear on top)", () => {
                const layer1 = LayerFactory.create({ name: "layer1" });
                const layer2 = LayerFactory.create({ name: "layer2" });

                const state = createDocumentState({
                    documents: [ DocumentFactory.create({ name: "foo", layers: [ layer1 ] }) ],
                    activeIndex: 0
                });
                mutations.addLayer( state, layer2 );

                expect( state.documents[ 0 ].layers ).toEqual([ layer1, layer2 ]);
            });

            it( "should be able to add layers at specific indices in the layer list", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({
                            name: "foo",
                            layers: [
                                LayerFactory.create({ name: "layer1" }),
                                LayerFactory.create({ name: "layer2" })
                            ]
                        })
                    ],
                    activeIndex: 0,
                    activeLayerIndex: 0,
                });
                const layer = { name: "layer3" };
                mutations.insertLayerAtIndex( state, { index: 1, layer });
                expect( state.documents[ 0 ].layers ).toEqual([
                    { name: "layer1" }, layer, { name: "layer2" }
                ]);
                expect( state.activeLayerIndex ).toEqual( 1 );
            });
        });

        describe( "when removing layers", () => {
            it( "should be able to remove a layer by reference", () => {
                const state = createDocumentState({
                    documents: [ DocumentFactory.create({
                        name: "foo",
                        layers: [
                            LayerFactory.create({ name: "layer1" }),
                            LayerFactory.create({ name: "layer2" }),
                            LayerFactory.create({ name: "layer3" })
                        ]
                    })],
                    activeIndex: 0,
                    activeLayerIndex: 1,
                });
                const [ layer1, layer2, layer3 ] = state.documents;
                mockUpdateFn = vi.fn();

                mutations.removeLayer( state, 1 );

                expect( state.documents[ 0 ].layers ).toEqual([ layer1, layer3 ]);
                expect( state.activeLayerIndex ).toEqual( 0 );
                expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "flushLayerSprites", layer2 );
            });
        });

        it( "should be able to replace all layers in a single operation", () => {
            const state = createDocumentState({
                documents: [ DocumentFactory.create({
                    name: "foo",
                    layers: [
                        LayerFactory.create({ name: "layer1" }),
                        LayerFactory.create({ name: "layer2" }),
                        LayerFactory.create({ name: "layer3" })
                    ]
                })],
                activeIndex: 0,
                activeLayerIndex: 1,
            });
            const newLayers = [
                LayerFactory.create({ name: "layer4" }),
                LayerFactory.create({ name: "layer5" }),
            ];

            mutations.replaceLayers( state, newLayers );

            expect( state.documents[ 0 ].layers ).toEqual( newLayers );
        });

        it( "should be able to swap the layers in the currently active Document", () => {
            const fooLayer1 = LayerFactory.create({ name: "fooLayer1" });
            const fooLayer2 = LayerFactory.create({ name: "fooLayer2" });
            const barLayer1 = LayerFactory.create({ name: "barLayer1" });
            const barLayer2 = LayerFactory.create({ name: "barLayer2" });
            const barLayer3 = LayerFactory.create({ name: "barLayer3" });
            const barLayer4 = LayerFactory.create({ name: "barLayer4" });

            const document1 = DocumentFactory.create({ name: "foo", layers: [ fooLayer1, fooLayer2 ] });
            const document2 = DocumentFactory.create({ name: "bar", layers: [ barLayer1, barLayer2, barLayer3, barLayer4 ] });

            const state = createDocumentState({
                documents: [ document1, document2 ],
                activeIndex: 1
            });

            mutations.swapLayers( state, { index1: 1, index2: 3 });
            
            expect( state.documents ).toEqual([
                { ...document1, layers: [ fooLayer1, fooLayer2 ] },
                { ...document2, layers: [ barLayer1, barLayer4, barLayer3, barLayer2 ]},
            ]);
        });

        it( "should be able to reorder all layers in the currently active Document", () => {
            const layers = [
                LayerFactory.create({ id: "A", name: "layer1" }),
                LayerFactory.create({ id: "B", name: "layer2" }),
                LayerFactory.create({ id: "C", name: "layer3" }),
                LayerFactory.create({ id: "D", name: "layer4" }),
            ];
            const orgLayers = [ ...layers ];
            const state = createDocumentState({
                documents: [ DocumentFactory.create({ name: "foo", layers })],
                activeIndex: 0
            });
            mutations.reorderLayers( state, { document: state.documents[ 0 ], layerIds: [ "B", "C", "A", "D" ] });
            // note we check by reference to ensure all bindings remain
            expect( state.documents[ 0 ].layers ).toEqual([
                orgLayers[ 1 ], orgLayers[ 2 ], orgLayers[ 0 ], orgLayers[ 3 ]
            ]);
        });

        describe( "when setting the active layer content", () => {
            it( "should be able to set the active layer by index", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({
                            name: "foo",
                            layers: [
                                LayerFactory.create({ name: "layer1" }),
                                LayerFactory.create({ name: "layer2" })
                            ]
                        })
                    ],
                    activeIndex: 0,
                    activeLayerIndex: 0
                });
                mutations.setActiveLayerIndex( state, 1 );
                expect( state.activeLayerIndex ).toEqual( 1 );
            });

            it( "should be able to set the active layer by reference", () => {
                const state = createDocumentState({
                    documents: [ DocumentFactory.create({
                        name: "foo",
                        layers: [
                            LayerFactory.create({ name: "layer1" }),
                            LayerFactory.create({ name: "layer2" })
                        ]
                    })],
                    activeIndex: 0,
                    activeLayerIndex: 0
                });
                mutations.setActiveLayer( state, state.documents[ 0 ].layers[ 1 ] );
                expect( state.activeLayerIndex ).toEqual( 1 );
            });

            it( "should unset the active layer mask when setting the active layer index", () => {
                const state = createDocumentState({
                    documents: [
                        DocumentFactory.create({
                            name: "foo",
                            layers: [
                                LayerFactory.create({ name: "layer1" }),
                                LayerFactory.create({ name: "layer2" })
                            ]
                        })
                    ],
                    activeLayerIndex: 0,
                    maskActive: true,
                });
                mutations.setActiveLayerIndex( state, 1 );
                expect( state.maskActive ).toBe( false );
            });

            it( "should be able to set the active layer mask", () => {
                const state = createDocumentState({
                    documents: [ DocumentFactory.create({
                        name: "foo",
                        layers: [
                            LayerFactory.create({ name: "layer1" }),
                            LayerFactory.create({ name: "layer2", mask: createMockCanvasElement()})
                        ]
                    })],
                    activeIndex: 0,
                    activeLayerIndex: 0,
                    maskActive: false,
                });
                mutations.setActiveLayerMask( state, 1 );
                expect( state.activeLayerIndex ).toEqual( 1 );
                expect( state.maskActive ).toBe( true );
            });
        });

        describe( "when updating layer properties", () => {
            let layer1: Layer;
            let layer2: Layer;
            let state: DocumentState;

            beforeEach(() => {
                layer1 = LayerFactory.create({ name: "layer1", effects: { rotation: 0 } });
                layer2 = LayerFactory.create({ name: "layer2", effects: { rotation: 0 } });
                state = createDocumentState({
                    documents: [ DocumentFactory.create({
                        name: "foo",
                        layers: [ { ...layer1 }, { ...layer2 } ]
                    })],
                    activeIndex: 0
                });
            });

            it( "should be able to update the options of a specific layer within the active Document", () => {
                const index = 1;
                const opts  = {
                    name: "layer2 updated",
                    x: 100,
                    y: 200,
                    width: 100,
                    height: 150,
                    type: LayerTypes.LAYER_IMAGE
                };
                const mockSprite = { src: "bitmap", cacheEffects: vi.fn() };
                mockUpdateFn = vi.fn( fn => {
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

            it( "should be able to update the source image of a specific layer within the active Document, invoking a filter recache on the sprite", () => {
                const index = 1;
                const opts  = {
                    name: "layer2 updated",
                    source: new Image(),
                    type: LayerTypes.LAYER_IMAGE
                };
                const mockSprite = { src: "bitmap", resetFilterAndRecache: vi.fn() };
                mockUpdateFn = vi.fn( fn => {
                    if ( fn === "getSpriteForLayer" ) return mockSprite;
                    return true;
                });
                mutations.updateLayer( state, { index, opts });
                expect( mockSprite.resetFilterAndRecache ).toHaveBeenCalled();
            });

            it( "should be able to update the effects of a specific layer within the active Document", () => {
                const index   = 0;
                const effects = { rotation: 1.6 };
                const mockSprite = { src: "bitmap", invalidate: vi.fn() };
                mockUpdateFn = vi.fn( fn => {
                    if ( fn === "getSpriteForLayer" ) return mockSprite;
                    return true;
                });
                mutations.updateLayerEffects( state, { index, effects });
                expect( state.documents[ 0 ].layers[ index ] ).toEqual({
                    ...layer1,
                    effects,
                });
                expect( mockUpdateFn ).toHaveBeenCalledWith( "getSpriteForLayer", state.documents[ 0 ].layers[ index ] );
                expect( mockSprite.invalidate ).toHaveBeenCalled();
            });
        });

        it( "should be able to resize active Document content by calling the render util upon each Layer", async () => {
            const layer1 = LayerFactory.create({ name: "layer1" });
            const layer2 = LayerFactory.create({ name: "layer2" });
            const state = createDocumentState({
                documents: [
                    DocumentFactory.create({ layers: [ layer1, layer2 ]}),
                ],
                activeIndex: 0,
            });
            mockUpdateFn = vi.fn();
            const scaleX = 1.1;
            const scaleY = 1.2;
            await mutations.resizeActiveDocumentContent( state, { scaleX, scaleY });
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "resizeLayerContent", layer1, scaleX, scaleY );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "resizeLayerContent", layer2, scaleX, scaleY );
        });

        it( "should be able to crop active Document content by calling the render util upon each Layer", async () => {
            const layer1 = LayerFactory.create({ name: "layer1" });
            const layer2 = LayerFactory.create({ name: "layer2" });
            const state = createDocumentState({
                documents: [
                    DocumentFactory.create({ layers: [ layer1, layer2 ]}),
                ],
                activeIndex: 0,
            });
            mockUpdateFn = vi.fn();
            const left = 10;
            const top  = 15;
            await mutations.cropActiveDocumentContent( state, { left, top });
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "cropLayerContent", layer1, left, top );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "getSpriteForLayer", layer1 );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 3, "cropLayerContent", layer2, left, top );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 4, "getSpriteForLayer", layer2 );
        });
    });
});
