import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockZoomableCanvas, createStore } from "../../mocks";
import LayerFactory from "@/model/factories/layer-factory";
import LayerRenderer from "@/rendering/actors/layer-renderer";
import { stopLayerDrag } from "@/model/actions/layer-drag-stop";

const mockGetRendererForLayer = vi.fn();
vi.mock( "@/model/factories/renderer-factory", () => ({
    getRendererForLayer: vi.fn(( ...args ) => mockGetRendererForLayer( ...args )),
}));

const mockPointerUp = vi.fn();
vi.mock( "@/utils/renderer-util", () => ({
    pointerUp: ( ...args: any[] ) => mockPointerUp( ...args ),
}));

const mockCanvasInstance = createMockZoomableCanvas();
vi.mock( "@/services/canvas-service", () => ({
    getCanvasInstance: vi.fn(() => mockCanvasInstance ),
}));

describe( "layer drag stop action", () => {
    const layer = LayerFactory.create();
    const layerRenderer = new LayerRenderer( layer );
    const store = createStore();

    beforeEach(() => {
        mockGetRendererForLayer.mockReturnValue( layerRenderer );
    });

    afterEach(() => {
        vi.resetAllMocks();
    });
    
    it( "should invoke a pointer up event on the Layers renderer", () => {
        stopLayerDrag( store, layer );

        expect( mockPointerUp ).toHaveBeenCalledWith( layerRenderer, 0, 0 );
    });

    it( "should unset the dragging Sprite reference on the Zoomable canvas", () => {
        mockCanvasInstance.draggingSprite = layerRenderer;

        stopLayerDrag( store, layer );

        expect( mockCanvasInstance.draggingSprite ).toBeNull();
    });
});