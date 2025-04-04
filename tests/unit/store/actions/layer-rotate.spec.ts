import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import TransformationsFactory from "@/factories/transformations-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { rotateLayer } from "@/store/actions/layer-rotate";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "rotate Layer action", () => {
    const layer = LayerFactory.create({
        transformations: TransformationsFactory.create({ rotation: 2 }),
    });
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to set the rotation of a specific Layer within the Document", () => {
        rotateLayer( store, layer, 2, 3 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "updateLayerTransformations", {
            index: 2,
            transformations: { rotation: 3 },
        });
    });

    it( "should store the action in state history", () => {
        rotateLayer( store, layer, 2, 3 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `rotation_2`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original rotation when calling undo in state history", () => {
        rotateLayer( store, layer, 2, 3 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "updateLayerTransformations", {
            index: 2,
            transformations: { rotation: 2 },
        });
    });

    it( "should reapply the new rotation when calling redo in state history", () => {
        rotateLayer( store, layer, 2, 3 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "updateLayerTransformations", {
            index: 2,
            transformations: { rotation: 3 },
        });
    });
});