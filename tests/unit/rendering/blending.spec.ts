import { it, describe, expect, vi } from "vitest";
import { BlendModes } from "@/definitions/blend-modes";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import { hasBlend } from "@/rendering/blending";

vi.mock( "@/utils/canvas-util", () => ({
    createCanvas: vi.fn().mockReturnValue({ cvs: {}, ctx: {} }),
}));

describe( "blending", () => {
    it( "should not consider a Layer that has a NORMAL blend configured as having a blend", () => {
        const filters = FiltersFactory.create({ enabled: true, blendMode: BlendModes.NORMAL });
        const layer = LayerFactory.create({ filters });

        expect( hasBlend( layer )).toBe( false );
    });

    it( "should not consider a Layer that has a positive blend filter configured, but its filters disabled, as having a blend", () => {
        const filters = FiltersFactory.create({ enabled: false, blendMode: BlendModes.DARKEN });
        const layer = LayerFactory.create({ filters });

        expect( hasBlend( layer )).toBe( false );
    });

    it( "should consider a Layer that has a positive blend filter configured, and its filters enabled, as having a blend", () => {
        const filters = FiltersFactory.create({ enabled: true, blendMode: BlendModes.DARKEN });
        const layer = LayerFactory.create({ filters });

        expect( hasBlend( layer )).toBe( true );
    });
});