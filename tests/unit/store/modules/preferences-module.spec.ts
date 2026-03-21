import { it, describe, expect, vi } from "vitest";
import { mockZCanvas } from "../../mocks";
import storeModule, { createPreferencesState, type Preferences } from "@/store/modules/preferences-module";

const { getters, mutations, actions } = storeModule;

let mockStorageData: Partial<Preferences>;
Storage.prototype.getItem = vi.fn(() => JSON.stringify( mockStorageData ));

mockZCanvas();

const mockSetThumbnailCacheEnabled = vi.fn();
vi.mock( "@/rendering/cache/thumbnail-cache", () => ({
    setEnabled: vi.fn(( ...args ) => mockSetThumbnailCacheEnabled( ...args )),
}));

const mockSetWasmFilters = vi.fn();
vi.mock( "@/services/render-service", () => ({
    setWasmFilters: vi.fn(( ...args ) => mockSetWasmFilters( ...args )),
}));

describe( "Vuex preferences module", () => {
    describe( "getters", () => {
        const state = createPreferencesState({
            lowMemory   : false,
            thumbnails  : false,
            wasmFilters : true,
            snapAlign   : true,
            antiAlias   : true,
        });

        it( "should be able to return all preferences", () => {
            expect( getters.preferences( state, getters, {}, {} )).toEqual( state.preferences );
        });

        it( "should be able to return individual preferences through the curried getters", () => {
            expect( getters.getPreference( state, getters, {}, {} )( "lowMemory" )).toEqual( state.preferences.lowMemory );
        });
    });

    describe( "mutations", () => {
        it( "should be able to add new/update values to the existing preferences", () => {
            const state = createPreferencesState({
                lowMemory   : false,
                thumbnails  : false,
                wasmFilters : true,
                antiAlias   : true,
            });
            mutations.setPreferences( state, { lowMemory: true, thumbnails: true, snapAlign: false });
            expect( state.preferences ).toEqual({
                lowMemory   : true,
                thumbnails  : true,
                wasmFilters : true,
                snapAlign   : false,
                antiAlias   : true,
            });
        });
    });

    describe( "actions", () => {
        it( "should be able to restore previously saved preferences", async () => {
            mockStorageData = {
                lowMemory   : false,
                thumbnails  : false,
                wasmFilters : true,
                snapAlign   : true,
                antiAlias   : false
            };
            const commit = vi.fn();
            const dispatch = vi.fn();

            // @ts-expect-error Not all constituents of type 'Action<PreferencesState, any>' are callable
            await actions.restorePreferences({ commit, dispatch });

            expect( commit ).toHaveBeenNthCalledWith( 1, "setPreferences", mockStorageData );
            expect( commit ).toHaveBeenNthCalledWith( 2, "setSnapAlign", mockStorageData.snapAlign );
            expect( commit ).toHaveBeenNthCalledWith( 3, "setAntiAlias", mockStorageData.antiAlias );
            expect( dispatch ).toHaveBeenCalledWith( "handlePreferences" );
        });

        it( "should be able to store preferences", async () => {
            const state = createPreferencesState();
            const dispatch = vi.fn();

            // @ts-expect-error Not all constituents of type 'Action<PreferencesState, any>' are callable
            await actions.storePreferences({ state, dispatch });

            expect( dispatch ).toHaveBeenCalledWith( "handlePreferences" );
        });

        it( "should update related services when handling changes to preferences", () => {
            const state = createPreferencesState({
                lowMemory   : false,
                thumbnails  : true,
                wasmFilters : true,
                antiAlias   : true,
            })

            // @ts-expect-error Not all constituents of type 'Action<PreferencesState, any>' are callable
            actions.handlePreferences({ state });
            
            expect( mockSetThumbnailCacheEnabled ).toHaveBeenCalledWith( true );
            
            // WASM support is currently disabled
            expect( mockSetWasmFilters ).toHaveBeenCalledWith( false );
        });
    });
});
