import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCanvasElement, createMockZoomableCanvas, createStore, flushPromises } from "../../mocks";
import DocumentFactory from "@/model/factories/document-factory";
import LayerFactory from "@/model/factories/layer-factory";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import { startLayerDrag } from "@/model/actions/layer-drag-start";

const mockEnqueueState = vi.fn();
vi.mock( "@/model/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

const mockGetRendererForLayer = vi.fn();
vi.mock( "@/model/factories/renderer-factory", () => ({
    getRendererForLayer: vi.fn(( ...args ) => mockGetRendererForLayer( ...args )),
}));

const mockPointerUp = vi.fn();
const mockPointerDown = vi.fn();
vi.mock( "@/utils/renderer-util", () => ({
    pointerUp: ( ...args: any[] ) => mockPointerUp( ...args ),
    pointerDown: ( ...args: any[] ) => mockPointerDown( ...args ),
}));

const mockCanvasInstance = createMockZoomableCanvas();
vi.mock( "@/services/canvas-service", () => ({
    getCanvasInstance: vi.fn(() => mockCanvasInstance ),
}));

vi.mock( "@/utils/canvas-util", async ( importOriginal ) => ({
    ...await importOriginal(),
    cloneCanvas: vi.fn( cvs => cvs ),
}));

const mockSelectionContent = createMockCanvasElement();
const mockUpdatedSourceContent = createMockCanvasElement();
vi.mock( "@/utils/document-util", () => ({
    copySelection: vi.fn(() => Promise.resolve({
        type: "image",
        content: {
            bitmap: mockSelectionContent,
        },
    })),
    deleteSelectionContent: vi.fn(() => mockUpdatedSourceContent ),
}));

describe( "layer drag start action", () => {
    const layerSource = createMockCanvasElement();
    const layer = LayerFactory.create();
    const activeDocument = DocumentFactory.create({ layers: [ LayerFactory.create(), layer ]});
    activeDocument.activeSelection = [[ { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 } ]];
    const layerRenderer = new LayerRenderer( layer );
    const store = createStore();

    beforeEach(() => {
        mockGetRendererForLayer.mockReturnValue( layerRenderer );
        store.getters.activeDocument = activeDocument;
        mockCanvasInstance.draggingSprite = null;
        layer.source = layerSource;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should set the dragging Sprite reference onto the Zoomable canvas", () => {
        startLayerDrag( store, layer, 10, 10, true );

        expect( mockCanvasInstance.draggingSprite ).toEqual( layerRenderer );
    });

    describe( "when there is no selection active", () => {
        it( "should return false to indicate no action was handled", () => {
            const result = startLayerDrag( store, layer, 10, 10, true );

            expect( result ).toBe( false );
        });

        it( "should not perform any state changing actions", async () => {
            startLayerDrag( store, layer, 10, 10, true );

            await flushPromises();

            expect( store.commit ).not.toHaveBeenCalled();
        });
        
        it( "should not enqueue a history state", async () => {
            startLayerDrag( store, layer, 10, 10, true );

            await flushPromises();

            expect( mockEnqueueState ).not.toHaveBeenCalled();
        });
    });

    describe( "when there is a selection active", () => {
        beforeEach(() => {
            store.getters.hasSelection = true;
        });

        it( "should return true to indicate a action was handled", () => {
            const result = startLayerDrag( store, layer, 10, 10, true );

            expect( result ).toBe( true );
        });

        it( "should insert a new Layer with the cut Selection content", async () => {
            startLayerDrag( store, layer, 10, 10, true );

            await flushPromises();

            expect( store.commit ).toHaveBeenCalledWith( "insertLayerAtIndex", { index: 2, layer: expect.any( Object )});

            // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
            const insertedLayer = store.commit.mock.calls[ 0 ][ 1 ].layer;

            expect( insertedLayer.source ).toEqual( mockSelectionContent );
        });

        it( "should reuse the same Layer rel as the source Layer to support timeline Documents", async () => {
            const timelineLayer = { ...layer };
            timelineLayer.rel = {
                type: "tile",
                id: 1,
            };
            startLayerDrag( store, timelineLayer, 10, 10, true );

            await flushPromises();

            // @ts-expect-error TS2339 Property 'mock' does not exist on type 'Commit'.
            const insertedLayer = store.commit.mock.calls[ 0 ][ 1 ].layer;

            expect( insertedLayer.rel ).toEqual({
                type: "tile",
                id: 1,
            });
        });

        it( "should update the source of the existing Layer renderer with the cut content", async () => {
            startLayerDrag( store, layer, 10, 10, true );

            await flushPromises();

            expect( layer.source ).toEqual( mockUpdatedSourceContent );
        });

        it( "should switch the active dragging states of the original and newly created Layer renderers when triggered from a pointer event", async () => {
            startLayerDrag( store, layer, 10, 10, true );

            await flushPromises();

            expect( mockPointerUp ).toHaveBeenCalledWith( layerRenderer, 10, 10 );
            expect( mockPointerDown ).toHaveBeenCalled();
        });

        it( "should not switch the active dragging states of the original and newly created Layer renderers when not triggered from a pointer event", async () => {
            startLayerDrag( store, layer, 10, 10, false );

            await flushPromises();

            expect( mockPointerUp ).not.toHaveBeenCalled();
            expect( mockPointerDown ).not.toHaveBeenCalled();
        });

        it( "should unset the currently active Selection", async () => {
            startLayerDrag( store, layer, 10, 10, true );

            await flushPromises();

            expect( store.commit ).toHaveBeenCalledWith( "setActiveSelection", [] );
        });

        it( "should enqueue a history state", async () => {
            startLayerDrag( store, layer, 10, 10, true );

            await flushPromises();

            expect( mockEnqueueState ).toHaveBeenCalled();
        });

        describe( "and undo-ing the action", () => {
            it( "should remove the inserted Layer", async () => {
                startLayerDrag( store, layer, 10, 10, true );

                await flushPromises();

                const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
                vi.resetAllMocks();

                undo();

                await flushPromises();

                expect( store.commit ).toHaveBeenCalledWith( "removeLayer", 2 );
            });

            it( "should update the source of the existing Layer renderer with the original content", async () => {
                startLayerDrag( store, layer, 10, 10, true );

                await flushPromises();

                const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
                vi.resetAllMocks();

                undo();

                await flushPromises();

                expect( layer.source ).toEqual( layerSource );
            });

            it( "should restore the active Selection", async () => {
                startLayerDrag( store, layer, 10, 10, true );

                await flushPromises();

                const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
                vi.resetAllMocks();
                
                undo();

                await flushPromises();

                expect( store.commit ).toHaveBeenCalledWith( "setActiveSelection", activeDocument.activeSelection );
            });

            it( "should unset the active dragging states of the newly created Layer renderer when triggered from a pointer event", async () => {
                startLayerDrag( store, layer, 10, 10, true );

                await flushPromises();

                const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
                vi.resetAllMocks();
                
                undo();

                await flushPromises();

                expect( mockPointerUp ).toHaveBeenCalled();
            });

            it( "should not unset the active dragging states of the newly created Layer renderer when not triggered from a pointer event", async () => {
                startLayerDrag( store, layer, 10, 10, false );

                await flushPromises();

                const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
                vi.resetAllMocks();
                
                undo();

                await flushPromises();

                expect( mockPointerUp ).not.toHaveBeenCalled();
            });
        });
    });
});