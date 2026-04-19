import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCanvasElement, createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import DocumentFactory from "@/model/factories/document-factory";
import LayerFactory from "@/model/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { mergeLayerDown } from "@/model/actions/layer-merge-down";

const mockEnqueueState = vi.fn();
vi.mock( "@/model/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

vi.mock( "@/utils/canvas-util", async ( importOriginal ) => {
    return {
        ...await importOriginal(),
        resizeImage: () => Promise.resolve( createMockCanvasElement()),
    };
});

vi.mock( "@/utils/document-util", () => ({
    createSyncSnapshot: () => createMockCanvasElement(),
}));

describe( "layer merge action", () => {
    let store: Store<BitMapperyState>;

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "for a default Document type", () => {
        const activeDocument = DocumentFactory.create({
            layers: [
                LayerFactory.create(),
                LayerFactory.create(),
                LayerFactory.create(),
            ],
        });
        const activeLayerIndex = 2;
        const activeLayer = activeDocument.layers[ activeLayerIndex ];

        beforeEach(() => {
            store = createStore();
        });

        describe( "when merging two Layers", () => {
            it( "should remove the active Layer and the Layer below it", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", false );

                expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", activeLayerIndex );
                expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", activeLayerIndex - 1 );
            });

            it( "should insert a new Layer with the provided name", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", false );

                expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", {
                    index: activeLayerIndex - 1,
                    layer: expect.any( Object ),
                });

                // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
                const { layer } = store.commit.mock.calls[ 2 ][ 1 ];

                expect( layer.name ).toEqual( "foo" );
            });

            it( "should store the action in state history", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", false );
        
                expect( mockEnqueueState ).toHaveBeenCalledWith( 
                    expect.any( String ), {
                        undo: expect.any( Function ),
                        redo: expect.any( Function )
                    }
                );
            });

            it( "should be able to undo the merge and restore the original Layers", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", false );

                const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
                vi.resetAllMocks();

                undo();

                expect( store.commit ).toHaveBeenCalledTimes( 3 );
                expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", activeLayerIndex - 1 );
                expect( store.commit ).toHaveBeenNthCalledWith( 2, "insertLayerAtIndex", {
                    index: activeLayerIndex - 1,
                    layer: activeDocument.layers[ activeLayerIndex - 1 ]
                });
                expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", {
                    index: activeLayerIndex,
                    layer: activeDocument.layers[ activeLayerIndex ]
                });
            });
        });

        describe( "when merging all Layers in the Document", () => {
            it( "should remove all Layers", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", true );

                expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", 2 );
                expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", 1 );
                expect( store.commit ).toHaveBeenNthCalledWith( 3, "removeLayer", 0 );
            });

            it( "should insert a new Layer with the provided name", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", true );

                expect( store.commit ).toHaveBeenNthCalledWith( 4, "insertLayerAtIndex", {
                    index: 0,
                    layer: expect.any( Object ),
                });

                // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
                const { layer } = store.commit.mock.calls[ 3 ][ 1 ];

                expect( layer.name ).toEqual( "foo" );
            });

            it( "should be able to undo the merge and restore the original Layers", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", true );

                const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
                vi.resetAllMocks();

                undo();

                expect( store.commit ).toHaveBeenCalledTimes( 4 );
                expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", 0 );
                expect( store.commit ).toHaveBeenNthCalledWith( 2, "insertLayerAtIndex", {
                    index: 0,
                    layer: activeDocument.layers[ 0 ]
                });
                expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", {
                    index: 1,
                    layer: activeDocument.layers[ 1 ]
                });
                expect( store.commit ).toHaveBeenNthCalledWith( 4, "insertLayerAtIndex", {
                    index: 2,
                    layer: activeDocument.layers[ 2 ]
                });
            });
        });
    });

    describe( "for a timeline Document type", () => {
         const activeDocument = DocumentFactory.create({
            type: "timeline",
            layers: [
                LayerFactory.create({ rel: { type: "tile", id: 0 }}),
                LayerFactory.create({ rel: { type: "tile", id: 0 }}),

                LayerFactory.create({ rel: { type: "tile", id: 1 }}),
                LayerFactory.create({ rel: { type: "tile", id: 1 }}),
                LayerFactory.create({ rel: { type: "tile", id: 1 }}),

                LayerFactory.create({ rel: { type: "tile", id: 2 }}),
            ],
        });
        const activeLayerIndex = 3;
        const activeLayer = activeDocument.layers[ activeLayerIndex ];

        beforeEach(() => {
            store = createStore();
            store.getters.activeGroup = 1;
        });

        describe( "when merging two Layers in a tile group", () => {
            it( "should remove the active Layer and the Layer below it", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", false );

                expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", activeLayerIndex );
                expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", activeLayerIndex - 1 );
            });

            it( "should insert a new Layer with the provided name", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", false );

                expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", {
                    index: activeLayerIndex - 1,
                    layer: expect.any( Object ),
                });

                // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
                const { layer } = store.commit.mock.calls[ 2 ][ 1 ];

                expect( layer.name ).toEqual( "foo" );
            });

            it( "should insert a new Layer with the appropriate Tile group relation", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", false );

                // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
                const { layer } = store.commit.mock.calls[ 2 ][ 1 ];

                expect( layer.rel ).toEqual({
                    type: "tile",
                    id: store.getters.activeGroup,
                });
            });

            it( "should store the action in state history", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", false );
        
                expect( mockEnqueueState ).toHaveBeenCalledWith( 
                    expect.any( String ), {
                        undo: expect.any( Function ),
                        redo: expect.any( Function )
                    }
                );
            });

            it( "should be able to undo the merge and restore the original Layers", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", false );

                const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
                vi.resetAllMocks();

                undo();

                expect( store.commit ).toHaveBeenCalledTimes( 3 );
                expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", activeLayerIndex - 1 );
                expect( store.commit ).toHaveBeenNthCalledWith( 2, "insertLayerAtIndex", {
                    index: activeLayerIndex - 1,
                    layer: activeDocument.layers[ activeLayerIndex - 1 ]
                });
                expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", {
                    index: activeLayerIndex,
                    layer: activeDocument.layers[ activeLayerIndex ]
                });
            });
        });

        describe( "when merging all Layers in a tile group", () => {
            it( "should remove all Layers for that group", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", true );

                expect( store.commit ).toHaveBeenCalledTimes( 4 );
                expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", 4 );
                expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", 3 );
                expect( store.commit ).toHaveBeenNthCalledWith( 3, "removeLayer", 2 );
            });

            it( "should insert a new Layer with the provided name", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", true );

                expect( store.commit ).toHaveBeenNthCalledWith( 4, "insertLayerAtIndex", {
                    index: 2,
                    layer: expect.any( Object ),
                });

                // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
                const { layer } = store.commit.mock.calls[ 3 ][ 1 ];

                expect( layer.name ).toEqual( "foo" );
            });

            it( "should be able to undo the merge and restore the original Layers", async () => {
                await mergeLayerDown( store, activeDocument, activeLayer, activeLayerIndex, "foo", true );

                const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
                vi.resetAllMocks();

                undo();

                expect( store.commit ).toHaveBeenCalledTimes( 4 );
                expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", 2 );
                expect( store.commit ).toHaveBeenNthCalledWith( 2, "insertLayerAtIndex", {
                    index: 2,
                    layer: activeDocument.layers[ 2 ]
                });
                expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", {
                    index: 3,
                    layer: activeDocument.layers[ 3 ]
                });
                expect( store.commit ).toHaveBeenNthCalledWith( 4, "insertLayerAtIndex", {
                    index: 4,
                    layer: activeDocument.layers[ 4 ]
                });
            });
        });
    });
});