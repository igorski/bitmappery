import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Store } from "vuex";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { cutLayerContent } from "@/store/actions/content-cut-layers";
import { type BitMapperyState } from "@/store";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "cut Layers content action", () => {
    let store: Store<BitMapperyState> = createStore();
    const layer1 = LayerFactory.create();
    const layer2 = LayerFactory.create();
    const layer3 = LayerFactory.create();
    const layer4 = LayerFactory.create();

    afterEach(() => {
        vi.resetAllMocks();
    });
    
    beforeEach(() => {
        store.getters.activeDocument = DocumentFactory.create({
            layers: [ layer1, layer2, layer3, layer4 ],
        });
    });

    it( "should set the Layer contents into the copy module", () => {
        cutLayerContent( store, [ layer2, layer3 ]);
        
        expect( store.commit ).toHaveBeenCalledWith( "setCopiedContent", {
            type: "layer",
            content: [ layer2, layer3 ],
        });
    });

    it( "should remove the cut Layers from the document", () => {
        cutLayerContent( store, [ layer2, layer3 ]);
        
        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "removeLayer", 1 );
    });

    it( "should store the action in state history", () => {
        cutLayerContent( store, [ layer2, layer3 ]);

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            "cut_layers_2", {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });
    
    it( "should restore the removed Layers on undo", () => {
        cutLayerContent( store, [ layer2, layer3 ]);

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        vi.resetAllMocks();

        undo();

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 1, "insertLayerAtIndex", { index: 1, layer: layer2 });
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "insertLayerAtIndex", { index: 2, layer: layer3 });
    });
});