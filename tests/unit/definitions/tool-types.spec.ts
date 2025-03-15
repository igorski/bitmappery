import { it, describe, expect, vi } from "vitest";
import { createMockCanvasElement, mockZCanvas } from "../mocks";

mockZCanvas();

import { LayerTypes } from "@/definitions/layer-types";
import ToolTypes, { canDraw, PANE_TYPES, usesInteractionPane } from "@/definitions/tool-types";
import DocumentFactory from "@/factories/document-factory";
import LayerFactory from "@/factories/layer-factory";

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
            expect( canDraw( document, layer )).toBe( false );
        });

        it.each([
            LayerTypes.LAYER_IMAGE, LayerTypes.LAYER_TEXT,
        ])( `should not consider a "%s"-layer with an unselected mask to be drawable`, ( type: LayerTypes ) => {
            const layer = LayerFactory.create({ type, mask: createMockCanvasElement() });
            expect( canDraw( document, layer )).toBe( false );
        });

        it.each([
            LayerTypes.LAYER_IMAGE, LayerTypes.LAYER_TEXT,
        ])( `should consider a "%s"-layer with a selected mask to be drawable`, ( type: LayerTypes ) => {
            const layer = LayerFactory.create({ type, mask: createMockCanvasElement() });
            expect( canDraw( document, layer, layer.mask )).toBe( true );
        });

        it( `should consider a "${LayerTypes.LAYER_GRAPHIC}"-layer to be drawable`, () => {
            const layer = LayerFactory.create({ type: LayerTypes.LAYER_GRAPHIC });
            expect( canDraw( document, layer )).toBe( true );
        });
    });
});