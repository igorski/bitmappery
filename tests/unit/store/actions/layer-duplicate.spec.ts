import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCanvasElement, createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { duplicateLayer } from "@/store/actions/layer-duplicate";

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

describe( "duplicate layer action", () => {
    const layer = LayerFactory.create({
        name: "original layer",
        source: createMockCanvasElement(),
    });
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to insert a duplicate of the provided Layer at the provided index", () => {
        duplicateLayer( store, layer, 2 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "insertLayerAtIndex", {
            index: 2,
            layer: {
                ...layer,
                id: expect.any( String ),
                name: `${layer.name} #2`,
                source: expect.any( Object ),
            },
        });
    });

    it( "should store the action in state history", () => {
        duplicateLayer( store, layer, 2 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `duplicate_2`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should remove the inserted Layer when calling undo in state history", () => {
        duplicateLayer( store, layer, 2 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", 2);
    });

    it( "should re-add the clone of the provided Layer when calling redo in state history", () => {
        duplicateLayer( store, layer, 2 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", {
            index: 2,
            layer: {
                ...layer,
                id: expect.any( String ),
                name: `${layer.name} #2`,
                source: expect.any( Object ),
            },
        });
    });
});