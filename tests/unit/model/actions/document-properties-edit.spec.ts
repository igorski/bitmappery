import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "../../mocks";
import { type Document } from "@/model/types/document";
import DocumentFactory from "@/model/factories/document-factory";
import { type BitMapperyState } from "@/store";
import { editDocumentProperties, TRANSPARENT_COLOR } from "@/model/actions/document-properties-edit";

const mockEnqueueState = vi.fn();
vi.mock( "@/model/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

const mockRebuildAllTiles = vi.fn();
vi.mock( "@/rendering/cache/tile-cache", () => ({
    rebuildAllTiles: ( ...args: any[] ) => mockRebuildAllTiles( ...args ),
}));

const mockCanvasSetBackgroundColor = vi.fn();
const mockCanvasInvalidate = vi.fn();
vi.mock( "@/services/canvas-service", () => ({
    getCanvasInstance: () => ({
        setBackgroundColor: mockCanvasSetBackgroundColor,
        invalidate: mockCanvasInvalidate,
    }),
}));

describe( "edit Document properties action", () => {
    let activeDocument: Document;
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();
        activeDocument = DocumentFactory.create({ meta: { unit: "px", dpi: 300, bgColor: "#00FF00", swatches: [ "#0000FF" ] }});
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it( "should be able to edit the Document bgColor property", () => {
        editDocumentProperties( store, activeDocument, { bgColor: "#FF0000" });

        expect( store.commit ).toHaveBeenCalledWith( "updateMeta", { bgColor: "#FF0000" });
    });

    it( "should be able to edit the Document swatches", () => {
        editDocumentProperties( store, activeDocument, { swatches: [ "#FF0000", "#00FF00" ] });

        expect( store.commit ).toHaveBeenCalledWith( "updateMeta", { swatches: [ "#FF0000", "#00FF00" ] });
    });

    it( "should set the color onto the canvas instance and invalidate its contents", () => {
        editDocumentProperties( store, activeDocument, { bgColor: "#FF0000" });

        expect( mockCanvasSetBackgroundColor ).toHaveBeenCalledWith( "#FF0000" );
        expect( mockCanvasInvalidate ).toHaveBeenCalled();
    });

    it( "should unset the store prop and set a null value onto the canvas instance when a transparent color is provided", () => {
        editDocumentProperties( store, activeDocument, { bgColor: TRANSPARENT_COLOR });

        expect( store.commit ).toHaveBeenCalledWith( "updateMeta", { bgColor: undefined });
        expect( mockCanvasSetBackgroundColor ).toHaveBeenCalledWith( null );
    });

    it( "should request a rebuild of all tiles when the Document is of a timeline type", () => {
        activeDocument.type = "timeline";

        editDocumentProperties( store, activeDocument, { bgColor: TRANSPARENT_COLOR });

        expect( mockRebuildAllTiles ).toHaveBeenCalledWith( activeDocument );
    });

    it( "should not request a rebuild of all tiles when the Document isn't of a timeline type", () => {
        editDocumentProperties( store, activeDocument, { bgColor: TRANSPARENT_COLOR });

        expect( mockRebuildAllTiles ).not.toHaveBeenCalledWith();
    });

    it( "should restore the original color and content when calling undo in state history", () => {
        editDocumentProperties( store, activeDocument, { bgColor: "#FF0000", swatches: [ "#FF0000" ] });

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        vi.resetAllMocks();

        undo();

        expect( store.commit ).toHaveBeenCalledWith( "updateMeta", { bgColor: "#00FF00", swatches: [ "#0000FF" ] });
    });
});