import { it, describe, expect } from "vitest";
import { mockZCanvas } from "../mocks";

mockZCanvas();

import LayerFactory from "@/model/factories/layer-factory";
import MaskFactory from "@/model/factories/mask-factory";
import { isMaskSelected } from "@/utils/editor-util";

describe( "Editor utilities", () => {
    describe( "when determining a Masks selected state", () => {
        const mask = MaskFactory.create();
        const layer = LayerFactory.create({ mask });

        it( "should not consider a Mask selected for a Layer when there isn't an active one", () => {
            expect( isMaskSelected( layer, undefined )).toBe( false );
        });
        
        it( "should not consider a Mask selected for a Layer that isn't the active one", () => {
            const activeMask = MaskFactory.create();

            expect( isMaskSelected( layer, activeMask )).toBe( false );
        });

        it( "should consider a Mask selected for a Layer when it is the active one", () => {
            expect( isMaskSelected( layer, layer.mask )).toBe( true );
        });

        it( "should not consider a Mask selected for a Layer when it hasn't got a Mask", () => {
            const layerWithoutMask = LayerFactory.create();

            expect( isMaskSelected( layerWithoutMask, layerWithoutMask.mask )).toBe( false );
        });
    });
});