import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { type CopiedImage } from "@/definitions/editor";
import { LayerTypes } from "@/definitions/layer-types";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { pasteCopiedContent } from "@/store/actions/content-paste";
import { type BitMapperyState } from "@/store";
import { createMockCanvasElement, createStore } from "../../mocks";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

vi.mock("@/utils/canvas-util", () => ({
    createCanvas: vi.fn(() => ({ cvs: {}, ctx: {} })),
    cloneCanvas: vi.fn( cvs => cvs ),
    imageToBase64: vi.fn(),
    imageToCanvas: vi.fn(),
    base64ToLayerImage: vi.fn()
}));

describe( "content paste action", () => {
    let store: Store<BitMapperyState> = createStore();

    afterEach(() => {
        vi.resetAllMocks();
    });
    
    describe( "when pasting the current in-memory copied image content", () => {
        beforeEach(() => {
            store.getters.activeDocument = DocumentFactory.create();
            store.getters.activeLayerIndex = 0;
            
            store.state.copy.copyContent = {
                type: "image",
                content: {
                    bitmap: createMockCanvasElement(),
                    type: LayerTypes.LAYER_GRAPHIC,
                },
            };
        });

        it( "should be able to paste at the center of the Document", () => {
            pasteCopiedContent( store );
            
            expect( store.commit ).toHaveBeenCalledWith( "insertLayerAtIndex", { index: 1, layer: expect.any( Object ) });
            expect( store.dispatch ).toHaveBeenCalledWith( "clearSelection" );
        });

        it.each(
            [ LayerTypes.LAYER_GRAPHIC, LayerTypes.LAYER_IMAGE ]
        )( `should keep the original type when the selection was made from a "$%s"-Layer`, ( type: LayerTypes ) => {
            ( store.state.copy.copyContent.content as CopiedImage ).type = type;

            pasteCopiedContent( store );
            
            const createdLayer = ( store.commit as Mock ).mock.calls.find(([ cmd ]) => cmd === "insertLayerAtIndex" )![ 1 ].layer;
            
            expect( createdLayer.type ).toEqual( type );
        });

        it( `should convert a selection made from a "${LayerTypes.LAYER_TEXT}"-Layer to the "${LayerTypes.LAYER_GRAPHIC} type`, () => {
            ( store.state.copy.copyContent.content as CopiedImage ).type = LayerTypes.LAYER_TEXT;

            pasteCopiedContent( store );
            
            const createdLayer = ( store.commit as Mock ).mock.calls.find(([ cmd ]) => cmd === "insertLayerAtIndex" )![ 1 ].layer;
            
            expect( createdLayer.type ).toEqual( LayerTypes.LAYER_GRAPHIC );
            expect( createdLayer.rel ).toEqual({ type: "none" });
        });

        it( "should be able to paste inside the active group of a timeline Document", () => {
            store.getters.activeDocument.type = "timeline";
            store.getters.activeGroup = 1;

            pasteCopiedContent( store );
            
            const createdLayer = ( store.commit as Mock ).mock.calls.find(([ cmd ]) => cmd === "insertLayerAtIndex" )![ 1 ].layer;
            
            expect( createdLayer.rel ).toEqual({
                type: "tile",
                id: store.getters.activeGroup,
            });
        });

        it( "should store the action in state history", () => {
            const content = store.state.copy.copyContent.content as CopiedImage;

            pasteCopiedContent( store );

            expect( mockEnqueueState ).toHaveBeenCalledWith( 
                `paste_${content.type}_${content.bitmap.width}_${content.bitmap.height}`, {
                    undo: expect.any( Function ),
                    redo: expect.any( Function )
                }
            );
        });
        
        it( "should remove the pasted image Layer on undo", () => {
            pasteCopiedContent( store );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).toHaveBeenCalledWith( "removeLayer", 1 );
        });
    });

    describe( "when pasting the current in-memory copied Layer contents", () => {
        const copiedLayers = [ LayerFactory.create(), LayerFactory.create() ];

        beforeEach(() => {
            store.getters.activeDocument = DocumentFactory.create({
                layers: [ LayerFactory.create(), LayerFactory.create() ],
            });
            store.getters.activeLayerIndex = 1;
            
            store.state.copy.copyContent = {
                type: "layer",
                content: copiedLayers,
            };
        });

        it( "should paste the Layers after the currently active layer index", () => {
            pasteCopiedContent( store );

            expect( store.commit ).toHaveBeenCalledTimes( 2 );
            expect( store.commit ).toHaveBeenNthCalledWith( 1, "insertLayerAtIndex", { index: 2, layer: copiedLayers[ 0 ] });
            expect( store.commit ).toHaveBeenNthCalledWith( 2, "insertLayerAtIndex", { index: 3, layer: copiedLayers[ 1 ] });
        });

        it( "should be able to paste the Layers inside the active group of a timeline Document", () => {
            store.getters.activeDocument.type = "timeline";
            store.getters.activeGroup = 1;

            pasteCopiedContent( store );
            
            const createdLayer = ( store.commit as Mock ).mock.calls.find(([ cmd ]) => cmd === "insertLayerAtIndex" )![ 1 ].layer;
            
            expect( createdLayer.rel ).toEqual({
                type: "tile",
                id: store.getters.activeGroup,
            });
        });

        it( "should store the action in state history", () => {
            pasteCopiedContent( store );

            expect( mockEnqueueState ).toHaveBeenCalledWith( 
                "paste_layer_2", {
                    undo: expect.any( Function ),
                    redo: expect.any( Function )
                }
            );
        });

        it( "should remove the pasted Layers on undo", () => {
            pasteCopiedContent( store );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).toHaveBeenCalledTimes( 2 );
            expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", 3 );
            expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", 2 );
        });
    });
});