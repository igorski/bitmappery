/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import type { ActionContext, Module } from "vuex";
import { isMobile } from "@/utils/environment-util";
import { setWasmFilters } from "@/services/render-service";

// @ts-expect-error 'import.meta' property not allowed (not an issue, Vite takes care of it)
const SUPPORT_WASM = import.meta.env.VITE_ENABLE_WASM_FILTERS === "true" && "WebAssembly" in window;

const STORAGE_KEY = "bpy_pref";

export type Preferences = {
    lowMemory: boolean;
    wasmFilters: boolean;
    snapAlign: boolean;
    antiAlias: boolean;
};

export interface PreferencesState {
    preferences: Preferences;
};

export const createPreferencesState = ( props?: Partial<Preferences> ): PreferencesState => ({
    preferences: {
        lowMemory   : isMobile(),
        wasmFilters : false,
        snapAlign   : false,
        antiAlias   : true,
        ...props,
    },
})

const PreferencesModule: Module<PreferencesState, any> = {
    state: (): PreferencesState => createPreferencesState(),
    getters: {
        preferences: ( state: PreferencesState ): Preferences => state.preferences,
        // curried, so not reactive !
        // @ts-expect-error using string as key
        getPreference: ( state: PreferencesState ): ( n: string ) => string => ( name: string ): boolean => state.preferences[ name ],
        supportWASM: (): boolean => SUPPORT_WASM,
    },
    mutations: {
        setPreferences( state: PreferencesState, preferences: Preferences ): void {
            state.preferences = { ...state.preferences, ...preferences };
        },
    },
    actions: {
        restorePreferences({ commit }: ActionContext<PreferencesState, any> ): void {
            const existing = window.localStorage?.getItem( STORAGE_KEY );
            if ( existing ) {
                try {
                    const preferences = JSON.parse( existing );
                    commit( "setPreferences", preferences );
                    // certain preferences need registration in different store modules
                    if ( typeof preferences.snapAlign === "boolean" ) {
                        commit( "setSnapAlign", preferences.snapAlign );
                    }
                    if ( typeof preferences.antiAlias === "boolean" ) {
                        commit( "setAntiAlias", preferences.antiAlias );
                    }
                    setWasmFilters( SUPPORT_WASM && !!preferences.wasmFilters );
                } catch {
                    // non-blocking
                }
            }
        },
        storePreferences({ state }: ActionContext<PreferencesState, any> ): void {
            window.localStorage?.setItem( STORAGE_KEY, JSON.stringify( state.preferences ));
        },
    }
};
export default PreferencesModule;
