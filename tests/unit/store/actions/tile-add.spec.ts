import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import type { Document, Layer } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { addTile } from "@/store/actions/tile-add";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "Tile add action", () => {
    let store: Store<BitMapperyState>;
    let activeDocument: Document;
    
    const tile1Layer1 = LayerFactory.create({ rel: { type: "tile", id: 0 }});
    const tile1Layer2 = LayerFactory.create({ rel: { type: "tile", id: 0 }});

    const tile2Layer1 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2Layer2 = LayerFactory.create({ rel: { type: "tile", id: 1 }});

    beforeEach(() => {
        store = createStore();
        store.getters.activeGroup = 1;

        activeDocument = DocumentFactory.create({
            width: 500,
            height: 500,
            layers: [
                tile1Layer1, tile1Layer2,
                tile2Layer1, tile2Layer2,
            ],
        });
        activeDocument.groups = [ 0, 1 ];
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "when adding a tile", () => {
        it( "should create a new Layer and group it under a new tile", () => {
            addTile( store, activeDocument );

            const { layer } = vi.mocked( store.commit ).mock.calls[ 0 ][ 1 ] as { index: number, layer: Layer };
            
            expect( layer.rel ).toEqual({
                type: "tile",
                id: 2,
            });
        });

        it( "should create a new Layer that matches the Document dimensions", () => {
            addTile( store, activeDocument );

            const { layer } = vi.mocked( store.commit ).mock.calls[ 0 ][ 1 ] as { index: number, layer: Layer };
            
            expect( layer.width ).toEqual( activeDocument.width );
            expect( layer.height ).toEqual( activeDocument.height );
        });

        it( "should append the created Layer after the last Layer index", () => {
            addTile( store, activeDocument );

            expect( store.commit ).toHaveBeenNthCalledWith( 1, "insertLayerAtIndex", { index: 4, layer: expect.any( Object )});
        });

        it( "should mark the added set index as the active set", () => {
            addTile( store, activeDocument );

            expect( store.commit ).toHaveBeenCalledWith( "setActiveGroup", 2 );
        });
    });

    describe( "when restoring a tile cloning step", () => {
        it( "should remove the added Layer", () => {
            addTile( store, activeDocument );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", 4 );
        });

        it( "should mark the originally active set as the active set", () => {
            addTile( store, activeDocument );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).toHaveBeenCalledWith( "setActiveGroup", 1 );
        });
    });
});