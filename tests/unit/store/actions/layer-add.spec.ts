import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import { LayerTypes } from "@/definitions/layer-types";
import ToolTypes from "@/definitions/tool-types";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { addLayer } from "@/store/actions/layer-add";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "add Layer action", () => {
    const layer = LayerFactory.create();
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        store.getters.activeLayerIndex = 3;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to add a Layer to the Documents Layer list", () => {
        addLayer( store, layer, 2 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "insertLayerAtIndex", { index: 2, layer });
    });

    it( "should not adjust the current tool type when the Layer is not of the text type", () => {
        addLayer( store, LayerFactory.create({ type: LayerTypes.LAYER_IMAGE }), 2 );

        expect( store.commit ).not.toHaveBeenCalledWith( "setActiveTool", { tool: expect.any( String ) });
    });

    it( "should set the current tool type to TEXT when the Layer is of the text type to allow for instant typing", () => {
        addLayer( store, LayerFactory.create({ type: LayerTypes.LAYER_TEXT }), 2 );

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenCalledWith( "setActiveTool", { tool: ToolTypes.TEXT });
    });

    it( "should store the action in state history", () => {
        addLayer( store, layer, 2 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `layerAdd_2`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should remove the added Layer when calling undo in state history", () => {
        addLayer( store, layer, 2 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", 2 );
    });

    it( "should re-add the provided Layer when calling redo in state history", () => {
        addLayer( store, layer, 2 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", { index: 2, layer });
    });

    it( "should not set the current tool type to TEXT when undoing and redoing the addition of a Layer of the text type", () => {
        const textLayer = LayerFactory.create({ type: LayerTypes.LAYER_TEXT });
        addLayer( store, textLayer, 2 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( store.commit ).toHaveBeenCalledTimes( 4 );

        expect( store.commit ).toHaveBeenNthCalledWith( 1, "insertLayerAtIndex", { index: 2, layer: textLayer });
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "setActiveTool", { tool: ToolTypes.TEXT });
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "removeLayer", 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 4, "insertLayerAtIndex", { index: 2, layer: textLayer });
    });
});