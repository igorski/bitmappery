import { type Store } from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockZoomableCanvas, createStore, mockZCanvas } from "../../mocks";

mockZCanvas();

import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";
import { createRendererForLayer, flushRendererCache } from "@/factories/renderer-factory";
import type LayerRenderer from "@/rendering/actors/layer-renderer";
import { type BitMapperyState } from "@/store";
import { resizeCanvas } from "@/store/actions/canvas-resize";

const mockEnqueueState = vi.fn();
vi.mock( "@/factories/history-state-factory", () => ({
    enqueueState: ( ...args: any[] ) => mockEnqueueState( ...args ),
}));

describe( "canvas resize action", () => {
    const document = DocumentFactory.create({
        width: 400,
        height: 300,
        layers: [
            LayerFactory.create({
                left: 0,
                top: 0,
                width: 400,
                height: 300,
            }),
            LayerFactory.create({
                left: 100,
                top: 100,
                width: 200,
                height: 200,
            }),
        ],
    });
    let layer1renderer: LayerRenderer;
    let layer2renderer: LayerRenderer;
    let store: Store<BitMapperyState>;
    
    beforeEach(() => {
        store = createStore();

        const [ layer1, layer2 ] = document.layers;

        layer1renderer = createRendererForLayer( createMockZoomableCanvas(), layer1, true );
        layer2renderer = createRendererForLayer( createMockZoomableCanvas(), layer2, true );

        layer1renderer.setBounds( layer1.left, layer1.top, layer1.width, layer1.height );
        layer2renderer.setBounds( layer2.left, layer2.top, layer2.width, layer2.height );
    });

    afterEach(() => {
        vi.resetAllMocks();
        flushRendererCache();
    });

    it( "should update the Document size and all Layer renderer bounds", () => {
        const orgRenderer1bounds = { ...layer1renderer.getBounds() };
        const orgRenderer2bounds = { ...layer2renderer.getBounds() };

        resizeCanvas( store, document, 200, 150, -50, -50 );

        expect( layer1renderer.getBounds().left ).toEqual( orgRenderer1bounds.left - 50 );
        expect( layer1renderer.getBounds().left ).toEqual( orgRenderer1bounds.left - 50 );

        expect( layer2renderer.getBounds().left ).toEqual( orgRenderer2bounds.left - 50 );
        expect( layer2renderer.getBounds().left ).toEqual( orgRenderer2bounds.left - 50 );

        expect( store.commit ).toHaveBeenCalledTimes( 1 );
        expect( store.commit ).toHaveBeenCalledWith( "setActiveDocumentSize", { width: 200, height: 150 });
    });

    it( "should store the action in state history", () => {
        resizeCanvas( store, document, 200, 150, -50, -50 );

        expect( mockEnqueueState ).toHaveBeenCalledWith( 
            `resizeCanvas`, {
                undo: expect.any( Function ),
                redo: expect.any( Function )
            }
        );
    });

    it( "should restore the original Document size and all Layer renderer bounds when calling undo in state history", () => {
        const orgRenderer1bounds = { ...layer1renderer.getBounds() };
        const orgRenderer2bounds = { ...layer2renderer.getBounds() };

        resizeCanvas( store, document, 200, 150, -50, -50 );

        const { undo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();

        expect( layer1renderer.getBounds().left ).toEqual( orgRenderer1bounds.left );
        expect( layer1renderer.getBounds().left ).toEqual( orgRenderer1bounds.left );

        expect( layer2renderer.getBounds().left ).toEqual( orgRenderer2bounds.left );
        expect( layer2renderer.getBounds().left ).toEqual( orgRenderer2bounds.left );

        expect( store.commit ).toHaveBeenCalledTimes( 2 );
        expect( store.commit ).toHaveBeenNthCalledWith( 2, "setActiveDocumentSize", { width: 400, height: 300 });
    });

    it( "should restore the replaced values when calling redo in state history", () => {
        const orgRenderer1bounds = { ...layer1renderer.getBounds() };
        const orgRenderer2bounds = { ...layer2renderer.getBounds() };
        
        resizeCanvas( store, document, 200, 150, -50, -50 );

        const { undo, redo } = mockEnqueueState.mock.calls[ 0 ][ 1 ];
        undo();
        redo();

        expect( layer1renderer.getBounds().left ).toEqual( orgRenderer1bounds.left - 50 );
        expect( layer1renderer.getBounds().left ).toEqual( orgRenderer1bounds.left - 50 );

        expect( layer2renderer.getBounds().left ).toEqual( orgRenderer2bounds.left - 50 );
        expect( layer2renderer.getBounds().left ).toEqual( orgRenderer2bounds.left - 50 );

        expect( store.commit ).toHaveBeenCalledTimes( 3 );
        expect( store.commit ).toHaveBeenNthCalledWith( 3, "setActiveDocumentSize", { width: 200, height: 150 });
    });
});