import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { addMask } from "@/store/actions/mask-add";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

const mockClipContext = vi.fn();
vi.mock( "@/rendering/operations/clipping", () => ({
    clipContextToSelection: ( ...args: any[] ) => mockClipContext( ...args ),
}));

const mockInteractionPaneSetSelection = vi.fn();
vi.mock( "@/services/canvas-service", () => ({
    getCanvasInstance: () => ({
        interactionPane: {
            setSelection: ( ...args: any[] ) => mockInteractionPaneSetSelection( ...args ),
        },
    }),
}));

vi.mock( "@/utils/canvas-util", () => ({
    createCanvas: ( width: number, height: number ) => ({
        cvs: {
            width,
            height,
        },
        ctx: {
            fill: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
        }
    })
}));

describe( "add mask action", () => {
    const layer = LayerFactory.create();
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to add a mask to a specific Layer within the Document", () => {
        addMask( store, layer, 2 );

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenCalledWith( "updateLayer", {
            index: 2,
            opts: {
                mask: expect.any( Object ),
            },
        });
        expect( store.commit ).toHaveBeenCalledWith( "setActiveLayerMask", 2 );
        expect( mockClipContext ).not.toHaveBeenCalled();
    });

    it( "should store the action in state history", () => {
        addMask( store, layer, 2 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `maskAdd_2`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should remove the added mask when calling undo in state history", () => {
        addMask( store, layer, 2 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 4 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "updateLayer", {
            index: 2,
            opts: { 
                mask: null,
            },
        });
        expect( store.commit ).toHaveBeenNthCalledWith( 4, "setActiveLayerMask", null );
    });

    it( "should restore the previously added mask when calling redo in state history", () => {
        addMask( store, layer, 2 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 6 );
        expect( store.commit ).toHaveBeenNthCalledWith( 5, "updateLayer", {
            index: 2,
            opts: {
                mask: expect.any( Object ),
            },
        });
        expect( store.commit ).toHaveBeenNthCalledWith( 6, "setActiveLayerMask", 2 );
    });

    describe( "when there is an active selection while adding a mask", () => {
        const activeSelection = [
            [
                { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }
            ]
        ];
        const activeDocument = DocumentFactory.create();
        activeDocument.activeSelection = activeSelection;

        beforeEach(() => {
            store.getters.activeDocument = activeDocument;
        });

        it( "should create the mask using the current selection, when set", () => {
            addMask( store, layer, 2 );

            expect( mockClipContext ).toHaveBeenCalledWith(
                expect.any( Object ), activeDocument.activeSelection, layer.left, layer.top, activeDocument.invertSelection,
            );
        });

        it( "should unset the active selection", () => {
            addMask( store, layer, 2 );

            expect( mockInteractionPaneSetSelection ).toHaveBeenCalledWith( [], false );
        });

        it( "should revert to the provided previous Selection when calling undo in state history", () => {
            addMask( store, layer, 2 );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            undo();

            expect( mockInteractionPaneSetSelection ).toHaveBeenNthCalledWith( 2, activeSelection, false );
        });
    });
});