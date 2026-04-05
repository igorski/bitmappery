import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCanvasElement } from "../../mocks";
import { type Layer } from "@/definitions/document";
import { type CopiedImage } from "@/definitions/editor";
import { LayerTypes } from "@/definitions/layer-types";
import storeModule, { createSelectionState, type SelectionState } from "@/store/modules/selection-module";

vi.mock("@/utils/canvas-util", () => ({
    createCanvas: vi.fn(() => ({ cvs: {}, ctx: {} })),
    cloneCanvas: vi.fn( cvs => cvs ),
    imageToBase64: vi.fn(),
    imageToCanvas: vi.fn(),
    base64ToLayerImage: vi.fn()
}));

const { getters, mutations, actions } = storeModule;

describe( "Vuex selection module", () => {
    describe( "mutations", () => {
        it( "should be able to set the current selection content", () => {
            const state = createSelectionState({ selectionContent: null });
            const selection = { bitmap: createMockCanvasElement(), type: LayerTypes.LAYER_GRAPHIC };
            mutations.setSelectionContent( state, selection );
            expect( state.selectionContent ).toEqual( selection );
        });
    });

    describe( "actions", () => {
        describe( "when pasting the current in-memory image selection", () => {
            const mockedGetters = { activeDocument: { width: 200, height: 150, layers: [] as Layer[] } };
            let state: SelectionState;

            beforeEach(() => {
                state = createSelectionState({
                    selectionContent: {
                        type: "image",
                        content: {
                            bitmap: createMockCanvasElement(),
                            type: LayerTypes.LAYER_GRAPHIC,
                        },
                    },
                });
            });

            it( "should be able to paste at the center of the Document", async () => {
                const commit   = vi.fn();
                const dispatch = vi.fn();

                // @ts-expect-error not assignable to parameter of type 'ActionContext<SelectionState, any>'
                await actions.pasteSelection({ state, getters: mockedGetters, commit, dispatch });
                
                expect( commit ).toHaveBeenCalledWith( "insertLayerAtIndex", { index: 0, layer: expect.any( Object ) });
                expect( dispatch ).toHaveBeenCalledWith( "clearSelection" );
            });

            it.each(
                [ LayerTypes.LAYER_GRAPHIC, LayerTypes.LAYER_IMAGE ]
            )( `should keep the original type when the selection was made from a "$%s"-Layer`, async ( type: LayerTypes ) => {
                const commit = vi.fn();

                ( state.selectionContent.content as CopiedImage ).type = type;

                // @ts-expect-error not assignable to parameter of type 'ActionContext<SelectionState, any>'
                await actions.pasteSelection({ state, getters: mockedGetters, commit, dispatch: vi.fn() });
                
                const createdLayer = commit.mock.calls.find(([ cmd ]) => cmd === "insertLayerAtIndex" )![ 1 ].layer;
                
                expect( createdLayer.type ).toEqual( type );
            });

            it( `should convert a selection made from a "${LayerTypes.LAYER_TEXT}"-Layer to the "${LayerTypes.LAYER_GRAPHIC} type`, async () => {
                const commit = vi.fn();

                ( state.selectionContent.content as CopiedImage ).type = LayerTypes.LAYER_TEXT;

                // @ts-expect-error not assignable to parameter of type 'ActionContext<SelectionState, any>'
                await actions.pasteSelection({ state, getters: mockedGetters, commit, dispatch: vi.fn() });
                
                const createdLayer = commit.mock.calls.find(([ cmd ]) => cmd === "insertLayerAtIndex" )![ 1 ].layer;
                
                expect( createdLayer.type ).toEqual( LayerTypes.LAYER_GRAPHIC );
            });
        });
    });
});