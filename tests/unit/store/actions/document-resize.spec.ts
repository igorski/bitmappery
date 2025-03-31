import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCanvasElement, createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import DocumentFactory from "@/factories/document-factory";
import { type BitMapperyState } from "@/store";
import { resizeDocument } from "@/store/actions/document-resize";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

vi.mock( "@/utils/canvas-util", async ( importOriginal ) => {
    return {
        ...await importOriginal(),
        cloneCanvas: () => createMockCanvasElement(),
        cloneResized: ( _src: any, width: number, height: number ) => createMockCanvasElement( width, height ),
    }
});

const MOCK_CLONED_CONTENT = new Map();
const mockRestoreFromClone = vi.fn();
vi.mock( "@/utils/document-util", () => ({
    cloneLayers: () => MOCK_CLONED_CONTENT,
    restoreFromClone: vi.fn(( ...args: any[] ) => mockRestoreFromClone( ...args )),
}));

describe( "resize Document action", () => {
    const document = DocumentFactory.create({ width: 400, height: 400 });
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        store.getters.activeLayerIndex = 3;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to resize the Document", async () => {
        await resizeDocument( store, document, { width: 200, height: 200 });

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenCalledWith( "resizeActiveDocumentContent", { scaleX: 0.5, scaleY: 0.5 });
        expect( store.commit ).toHaveBeenCalledWith( "setActiveDocumentSize", { width: 200, height: 200 });
    });

    it( "should round the provided values when resizing the Document", async () => {
        await resizeDocument( store, document, { width: 200.3434, height: 200.788 });

        expect( store.commit ).toHaveBeenCalledWith( "setActiveDocumentSize", { width: 200, height: 201 });
    });

    it( "should store the action in state history", async () => {
        await resizeDocument( store, document, { width: 200, height: 200 });

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `resizeDocument`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original dimensions and content when calling undo in state history", async () => {
        await resizeDocument( store, document, { width: 200, height: 200 });

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        await undo();

        expect( mockRestoreFromClone ).toHaveBeenCalledWith( document, MOCK_CLONED_CONTENT );
        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenCalledWith( "setActiveDocumentSize", { width: 400, height: 400 });
    });

    it( "should resize the Document to the provided values again when calling redo in state history", async () => {
        await resizeDocument( store, document, { width: 200, height: 200 });

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        await undo();
        await redo();

        expect( store.commit ).toHaveBeenCalledTimes( 5 );
        expect( store.commit ).toHaveBeenNthCalledWith( 4, "resizeActiveDocumentContent", { scaleX: 0.5, scaleY: 0.5 });
        expect( store.commit ).toHaveBeenNthCalledWith( 5, "setActiveDocumentSize", { width: 200, height: 200 });
    });
});