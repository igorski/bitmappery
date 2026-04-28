import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { Point } from "zcanvas";
import { createMockZoomableCanvas, mockZCanvas } from "../../mocks";

mockZCanvas();

import { applyOverrideConfig, createOverrideConfig, } from "@/rendering/utils/drawable-canvas-utils";

describe( "Drawable canvas utils", () => {
    const zoomableCanvas = createMockZoomableCanvas();
    let pointers: Point[];

    beforeEach(() => {
        zoomableCanvas.documentScale = 3;
        zoomableCanvas.zoomFactor = 2;
        ( zoomableCanvas.getViewport as Mock ).mockReturnValue({ left: 10, top: 5 });

        pointers = [
            { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
        ];
    });
    
    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "When creating a draw override configuration", () => {
        it( "should store the current Document scale and zoom factor", () => {
            const { scale, zoom } = createOverrideConfig( zoomableCanvas, { useViewport: true }, pointers )
            
            expect( scale ).toEqual( 1 / zoomableCanvas.documentScale );
            expect( zoom ).toEqual( zoomableCanvas.zoomFactor );
        });

        it( "should take the Viewport offset into account", () => {
            const { vpX, vpY } = createOverrideConfig( zoomableCanvas, { useViewport: true }, pointers );

            expect( vpX ).toEqual( 10 );
            expect( vpY ).toEqual( 5 );
        });

        it( "should ignore the Viewport offset when requested", () => {
            const { vpX, vpY } = createOverrideConfig( zoomableCanvas, { useViewport: false }, pointers );

            expect( vpX ).toEqual( 0 );
            expect( vpY ).toEqual( 0 );
        });
    });

    describe( "When applying a draw override configuration", () => {
        it( "should translate the pointer coordinates to reflect the Viewport position and Document scale in place", () => {
            const overrideConfig = createOverrideConfig( zoomableCanvas, { useViewport: true }, pointers );
            applyOverrideConfig( overrideConfig, pointers );

            expect( pointers ).toEqual([
                { x: -30, y: -15 }, { x: -20, y: -15 }, { x: -20, y: -5 }, { x: -30, y: -5 }, { x: -30, y: -15 }, 
            ]);
        });

        it( "should not translate the pointer coordinates when the Viewport position should be ignored", () => {
            const overrideConfig = createOverrideConfig( zoomableCanvas, { useViewport: false }, pointers );
            applyOverrideConfig( overrideConfig, pointers );

            expect( pointers ).toEqual([
                { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
            ]);
        });
    });
});
