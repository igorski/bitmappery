import { describe, expect, it } from "vitest";
import { getCanvasInstance, setCanvasInstance } from "@/services/canvas-service";

import { createMockZoomableCanvas } from "../mocks";

describe( "Canvas service", () => {
    describe( "when maintaining the active zCanvas instance", () => {
        it( "should not have an instance by default", () => {
            expect( getCanvasInstance() ).toBeNull();
        });

        it( "should be able to set and retrieve the active zCanvas instance", () => {
            const zCanvas = createMockZoomableCanvas();
            setCanvasInstance( zCanvas );
            expect( getCanvasInstance() ).toEqual( zCanvas );
        });

        it( "should be able to unset the active zCanvas instance", () => {
            expect( getCanvasInstance() ).not.toBeNull(); // set in previous test
            setCanvasInstance( null );
            expect( getCanvasInstance() ).toBeNull();
        });
    });
});
