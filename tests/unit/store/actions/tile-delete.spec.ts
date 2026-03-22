import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import { type Document } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { deleteTile } from "@/store/actions/tile-delete";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "Tile delete action", () => {
    let store: Store<BitMapperyState>;
    let activeDocument: Document;
    
    const tile1Layer1 = LayerFactory.create({ rel: { type: "tile", id: 0 }});
    const tile1Layer2 = LayerFactory.create({ rel: { type: "tile", id: 0 }});

    const tile2Layer1 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2Layer2 = LayerFactory.create({ rel: { type: "tile", id: 1 }});
    const tile2Layer3 = LayerFactory.create({ rel: { type: "tile", id: 1 }});

    const tile3Layer1 = LayerFactory.create({ rel: { type: "tile", id: 2 }});

    const tile4Layer1 = LayerFactory.create({ rel: { type: "tile", id: 3 }});
    const tile4Layer2 = LayerFactory.create({ rel: { type: "tile", id: 3 }});

    beforeEach(() => {
        store = createStore();
        store.getters.activeGroup = 1;

        activeDocument = DocumentFactory.create({
            layers: [
                tile1Layer1, tile1Layer2,
                tile2Layer1, tile2Layer2, tile2Layer3,
                tile3Layer1,
                tile4Layer1, tile4Layer2,
            ],
        });
        activeDocument.groups = [ 0, 1, 2, 3 ];
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "when delete a tile", () => {
        it( "should be able to delete the tiles Layer contents", () => {
            deleteTile( store, activeDocument, 1 );

            expect( store.commit ).toHaveBeenNthCalledWith( 1, "removeLayer", 2 );
            expect( store.commit ).toHaveBeenNthCalledWith( 2, "removeLayer", 3 );
            expect( store.commit ).toHaveBeenNthCalledWith( 3, "removeLayer", 4 );
        });

        it( "should update the active set index to the previous one in case it is the deleted set", () => {
            deleteTile( store, activeDocument, 1 );

            expect( store.commit ).toHaveBeenCalledWith( "setActiveGroup", 0 );
        });

        it( "should not update the active set index in case it is not equal to the deleted set", () => {
            deleteTile( store, activeDocument, 2 );

            expect( store.commit ).not.toHaveBeenCalledWith( "setActiveGroup", expect.any( Number ));
        });

        it( "should be able to update the set indices of any subsequent tile layers", () => {
            deleteTile( store, activeDocument, 1 );

            // validate existing sets with id 2 and 3 have moved to 1 and 2
            // NOTE: we don't check for exact index numbers as the mocked store function do not update the document
            // checking for rel id should cover the use case though

            expect( store.commit ).toHaveBeenNthCalledWith( 4, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 1 }}});
            expect( store.commit ).toHaveBeenNthCalledWith( 5, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 2 }}});
            expect( store.commit ).toHaveBeenNthCalledWith( 6, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 2 }}});

            expect( store.commit ).toHaveBeenNthCalledWith( 7, "setActiveGroup", 0 );
        });
    });

    describe( "when restoring a tile delete step", () => {
        it( "should restore the deleted layers", () => {
            deleteTile( store, activeDocument, 1 );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).toHaveBeenNthCalledWith( 1, "insertLayerAtIndex", { index: 2, layer: tile2Layer1 });
            expect( store.commit ).toHaveBeenNthCalledWith( 2, "insertLayerAtIndex", { index: 3, layer: tile2Layer2 });
            expect( store.commit ).toHaveBeenNthCalledWith( 3, "insertLayerAtIndex", { index: 4, layer: tile2Layer3 });
        });

        it( "should mark the originally active set as the active set in case it was the deleted one", () => {
            deleteTile( store, activeDocument, 1 );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).toHaveBeenCalledWith( "setActiveGroup", 1 );
        });

        it( "should not update the active set when the originally active set was not the deleted one", () => {
            deleteTile( store, activeDocument, 2 );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();

            undo();

            expect( store.commit ).not.toHaveBeenCalledWith( "setActiveGroup", expect.any( Number ));
        });

        it( "should restore the original tile set indices of all subsequent tile layers when restoring a delete action between tile sets", () => {
            deleteTile( store, activeDocument, 1 );

            const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
            vi.resetAllMocks();
            
            undo();

            // validate updated sets with ids 1 and 2 have moved back to 2 and 3
            
            expect( store.commit ).toHaveBeenNthCalledWith( 4, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 2 }}});
            expect( store.commit ).toHaveBeenNthCalledWith( 5, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 3 }}});
            expect( store.commit ).toHaveBeenNthCalledWith( 6, "updateLayer", { index: expect.any( Number ), opts: { rel: { type: "tile", id: 3 }}});

            expect( store.commit ).toHaveBeenNthCalledWith( 7, "setActiveGroup", 1 );
        });
    });
});