import { describe, expect, it, vi } from "vitest";
import { createMockCanvasElement } from "../../mocks";
import { LayerTypes } from "@/definitions/layer-types";
import storeModule, { createCopyState } from "@/store/modules/copy-module";

const { getters, mutations } = storeModule;

describe( "Vuex copy module", () => {
    describe( "getters", () => {
        it( "should know when it has copied content", () => {
            const state = createCopyState();

            expect( getters.hasCopiedContent( state, getters, {}, {} )).toBe( false );

            state.copyContent = {
                type: "image",
                content: {
                    bitmap: createMockCanvasElement(),
                    type: LayerTypes.LAYER_GRAPHIC,
                },
            };

            expect( getters.hasCopiedContent( state, getters, {}, {} )).toBe( true );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the current copied content", () => {
            const state = createCopyState({ copyContent: null });
            const copiedContent = { bitmap: createMockCanvasElement(), type: LayerTypes.LAYER_GRAPHIC };
            mutations.setCopiedContent( state, copiedContent );
            expect( state.copyContent ).toEqual( copiedContent );
        });
    });
});