import { beforeEach, describe, expect, it } from "vitest";

import { createMockCanvasElement, createState, mockZCanvas } from "../mocks";
mockZCanvas();

import { type Store } from "vuex";
import { BlendModes } from "@/definitions/blend-modes";
import { LayerTypes } from "@/definitions/layer-types";
import EffectsFactory from "@/factories/effects-factory";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { hasBlend, isDrawable, isMaskable, isRotated, isScaled } from "@/utils/layer-util";

describe( "Layer utilities", () => {
    let mockStore: Store<BitMapperyState>;

    beforeEach(() => {
        mockStore = createState() as unknown as Store<BitMapperyState>;
        // @ts-expect-error getters is readonly
        mockStore.getters = {
            activeLayerMask: null,
        };
    });

    describe( "when determining the Layers transformations", () => {
        it( "should know when it is rotated", () => {
            const layer = LayerFactory.create({
                effects: EffectsFactory.create({ rotation: 0 })
            });
            expect( isRotated( layer )).toBe( false );

            const rotatedLayer = LayerFactory.create({
                effects: EffectsFactory.create({ rotation: 90 })
            });

            expect( isRotated( rotatedLayer )).toBe( true );
        });

        it( "should know when it is scaled", () => {
            const layer = LayerFactory.create({
                effects: EffectsFactory.create({ scale: 1 })
            });
            expect( isScaled( layer ) ).toBe( false );

            const scaledLayer = LayerFactory.create({
                effects: EffectsFactory.create({ scale: 0.9 })
            });

            expect( isScaled( scaledLayer )).toBe( true );
        });
    });

    describe( "When determining the Layers blend state", () => {
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

    it( "should consider a Layer drawable when its of the GRAPHIC type or has a mask", () => {
        const graphicLayer = LayerFactory.create({ type: LayerTypes.LAYER_GRAPHIC } );
        const imageLayer   = LayerFactory.create({ type: LayerTypes.LAYER_IMAGE, mask: createMockCanvasElement() } );
        const textLayer    = LayerFactory.create({ type: LayerTypes.LAYER_TEXT,  mask: createMockCanvasElement() } );

        expect( isDrawable( graphicLayer, mockStore )).toBe( true );
        expect( isDrawable( imageLayer,   mockStore )).toBe( false );
        expect( isDrawable( textLayer,    mockStore )).toBe( false );
        
        mockStore.getters.activeLayerMask = imageLayer.mask;

        expect( isDrawable( imageLayer, mockStore )).toBe( true );

        mockStore.getters.activeLayerMask = textLayer.mask;
        
        expect( isDrawable( textLayer, mockStore )).toBe( true );
    });

    it( "should consider a Layer maskable when it has a mask which is currently marked as active in the store", () => {
        const layer = LayerFactory.create();

        expect( isMaskable( layer, mockStore )).toBe( false );
        
        layer.mask = createMockCanvasElement();

        expect( isMaskable( layer, mockStore )).toBe( false );

        mockStore.getters.activeLayerMask = layer.mask;

        expect( isMaskable( layer, mockStore )).toBe( true );
    });
});