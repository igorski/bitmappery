import { it, describe, expect } from "vitest";
import { mockZCanvas } from "../mocks";

mockZCanvas();

import { LayerTypes } from "@/definitions/layer-types";
import ToolTypes, { canDraw, canDragMask, PANE_TYPES, usesInteractionPane } from "@/definitions/tool-types";
import DocumentFactory from "@/model/factories/document-factory";
import LayerFactory from "@/model/factories/layer-factory";
import MaskFactory from "@/model/factories/mask-factory";
import TransformFactory from "@/model/factories/transform-factory";

describe( "tool types", () => {
    it.each(
        Object.values( ToolTypes )
    )( `should consider the "%s"-tool to use the interaction pane as defined by the PANE_TYPES list`, ( tool: ToolTypes ) => {
        expect( usesInteractionPane( tool )).toBe( PANE_TYPES.includes( tool ));
    });

    describe( "When determining whether the currently selected Layer is drawable", () => {
        const document = DocumentFactory.create();

        it.each([
            LayerTypes.LAYER_IMAGE, LayerTypes.LAYER_TEXT,
        ])( `should not consider a "%s"-layer to be drawable`, ( type: LayerTypes ) => {
            const layer = LayerFactory.create({ type });
            expect( canDraw( document, layer, undefined )).toBe( false );
        });

        it.each([
            LayerTypes.LAYER_IMAGE, LayerTypes.LAYER_TEXT,
        ])( `should not consider a "%s"-layer with an unselected mask to be drawable`, ( type: LayerTypes ) => {
            const layer = LayerFactory.create({ type, mask: MaskFactory.create() });
            expect( canDraw( document, layer, undefined )).toBe( false );
        });

        it.each([
            LayerTypes.LAYER_IMAGE, LayerTypes.LAYER_TEXT,
        ])( `should consider a "%s"-layer with a selected mask to be drawable`, ( type: LayerTypes ) => {
            const layer = LayerFactory.create({ type, mask: MaskFactory.create() });
            expect( canDraw( document, layer, layer.mask )).toBe( true );
        });

        it( `should consider a "${LayerTypes.LAYER_GRAPHIC}"-layer to be drawable`, () => {
            const layer = LayerFactory.create({ type: LayerTypes.LAYER_GRAPHIC });
            expect( canDraw( document, layer, undefined )).toBe( true );
        });
    });

    describe( "when determining whether the currently active Mask is draggable", () => {
        it( "should not consider a Layer without a Mask to have a draggable Mask", () => {
            const layer = LayerFactory.create();
            expect( canDragMask( layer, undefined )).toBe( false );
        });

        it( "should not consider a Layer with an unselected Mask to have a draggable Mask", () => {
            const layer = LayerFactory.create({ mask: MaskFactory.create() });
            expect( canDragMask( layer, undefined )).toBe( false );
        });

        it( "should consider a Layer with a selected Mask to have a draggable Mask", () => {
            const layer = LayerFactory.create({ mask: MaskFactory.create() });
            expect( canDragMask( layer, layer.mask )).toBe( true );
        });

        it( "should not consider a Layer with a Mask to have a draggable Mask when another Layers Mask is selected", () => {
            const layer = LayerFactory.create({ mask: MaskFactory.create() });
            expect( canDragMask( layer, MaskFactory.create() )).toBe( false );
        });

        it( "should not consider a Layer with a selected Mask to have a draggable Mask when the Layer is rotated because math is hard", () => {
            const layer = LayerFactory.create({
                mask: MaskFactory.create(),
                transform: TransformFactory.create({ rotation: 1 })
            });
            expect( canDragMask( layer, layer.mask )).toBe( false );
        });
    });
});
