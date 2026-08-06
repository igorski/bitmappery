/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2026 - https://www.igorski.nl
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
import { BlendModes } from "@/definitions/blend-modes";
import { MAX_CONTRAST, MIN_CONTRAST } from "@/definitions/filter-ranges";
import { mapRange } from "@/math/unit-math";
import { DeepPartial } from "@/model/types/_util";
import type { Filters } from "@/model/types/filters";

export type FiltersProps = DeepPartial<Filters>;

export const FACTORY_VERSION = 2;

export const DEFAULT_DUOTONE_1 = "#FF0000";
export const DEFAULT_DUOTONE_2 = "#0099FF";

const DEFAULT_QUICK_SETTINGS = {
    desaturate   : false,
    invert       : false,
    whiteBalance : false,
};

const DEFAULT_DUOTONE = {
    enabled: false,
    color1: DEFAULT_DUOTONE_1,
    color2: DEFAULT_DUOTONE_2,
};

const DEFAULT_HSL = {
    hue: 0.5,
    sat: 0.5,
    lightness: 0.5,
};

let defaultFilters: Filters | null = null;

const FiltersFactory = {
    create({
        enabled    = true,
        blendMode  = BlendModes.NORMAL,
        opacity    = 1,
        gamma      = 0.5,
        brightness = 0.5,
        contrast   = 0.5,
        exposure   = 0.5,
        vibrance   = 0.5,
        threshold  = -1,
        quick = DEFAULT_QUICK_SETTINGS,
        duotone = DEFAULT_DUOTONE,
        hsl = DEFAULT_HSL,
        blur = 0,
    }: FiltersProps = {}): Filters {
        return {
            enabled,
            blendMode,
            opacity,
            gamma,
            brightness,
            contrast,
            exposure,
            vibrance,
            threshold,
            quick: {
                ...DEFAULT_QUICK_SETTINGS,
                ...quick
            },
            hsl: {
                ...DEFAULT_HSL,
                ...hsl,
            },
            duotone: {
                ...DEFAULT_DUOTONE,
                ...duotone,
            },
            blur,
        };
    },

    /**
     * Saving filter properties into a simplified JSON structure
     * for project storage
     */
    serialize( filters: Filters ): any {
        const { duotone, hsl, quick } = filters;
        return {
            e: filters.enabled,
            m: filters.blendMode,
            o: filters.opacity,
            g: filters.gamma,
            b: filters.brightness,
            c: filters.contrast,
            d: quick.desaturate,
            i: quick.invert,
            w: quick.whiteBalance,
            x: filters.exposure,
            v: filters.vibrance,
            t: filters.threshold,
            de: duotone.enabled,
            d1: duotone.color1,
            d2: duotone.color2,
            hh: hsl.hue,
            hs: hsl.sat,
            hl: hsl.lightness,
            bl: filters.blur,
            fv: FACTORY_VERSION,
        };
    },

    /**
     * Creating a new filter list from a stored filters structure
     * inside a stored projects layer
     */
     deserialize( filters: any = {} ): Filters {
        const serializedVersion = filters.fv ?? 1;

        if ( serializedVersion === 1 ) {
            migrateLegacyContrast( filters ); // contrast did not support half-way neutral position and negative filtering
            if ( filters.hh !== undefined ) {
                migrateLegacyHSL( filters ); // HSL values were not in normalised range (note HSL was added later, hence null check)
            }
        }

        // nullish coalescing fallbacks as some properties were added in later app versions
        return FiltersFactory.create({
            enabled: filters.e,
            blendMode: filters.m,
            opacity: filters.o,
            gamma: filters.g,
            brightness: filters.b,
            contrast: filters.c,
            exposure: filters.x,
            vibrance: filters.v,
            threshold: filters.t,
            quick: {
                desaturate: filters.d,
                invert: filters.i ?? false,
                whiteBalance: filters.w ?? false,
            },
            duotone: {
                enabled: filters.de ?? false,
                color1: filters.d1 ?? DEFAULT_DUOTONE_1,
                color2: filters.d2 ?? DEFAULT_DUOTONE_2,
            },
            hsl: {
                hue: filters.hh ?? 0.5,
                sat: filters.hs ?? 0.5,
                lightness: filters.hl ?? 0.5,
            },
            blur: filters.bl,
        });
     }
};
export default FiltersFactory;

export const hasFilters = ( filters: Filters ): boolean => {
    if ( !filters.enabled ) {
        return false;
    }
    if ( !defaultFilters ) {
        defaultFilters = FiltersFactory.create();
    }
    return !isEqual( filters, defaultFilters );
};

export const isEqual = ( filters: Filters, filtersToCompareTo?: Filters ): boolean => {
    if ( !filtersToCompareTo ) {
        return false;
    }
    return filters.enabled    === filtersToCompareTo.enabled    &&
           filters.blendMode  === filtersToCompareTo.blendMode  &&
           filters.opacity    === filtersToCompareTo.opacity    &&
           filters.gamma      === filtersToCompareTo.gamma      &&
           filters.brightness === filtersToCompareTo.brightness &&
           filters.contrast   === filtersToCompareTo.contrast   &&
           filters.exposure   === filtersToCompareTo.exposure   &&
           filters.vibrance   === filtersToCompareTo.vibrance   &&
           filters.threshold  === filtersToCompareTo.threshold  &&
           // quick filters
           filters.quick.desaturate   === filtersToCompareTo.quick.desaturate &&
           filters.quick.invert       === filtersToCompareTo.quick.invert     &&
           filters.quick.whiteBalance === filtersToCompareTo.quick.whiteBalance &&
           // duotone
           filters.duotone.enabled === filtersToCompareTo.duotone.enabled &&
           filters.duotone.color1  === filtersToCompareTo.duotone.color1  &&
           filters.duotone.color2  === filtersToCompareTo.duotone.color2 &&
           // HSL
           filters.hsl.hue         === filtersToCompareTo.hsl.hue &&
           filters.hsl.sat         === filtersToCompareTo.hsl.sat &&
           filters.hsl.lightness   === filtersToCompareTo.hsl.lightness &&
           // blur
           filters.blur === filtersToCompareTo.blur;
};

/* internal methods */

// MIGRATIONS transform filter values serialised in a legacy factory format
// which have since been changed in the application. Migrations aim to keep the
// visual result of the legacy filter equal to the new format

// prior to FACTORY_VERSION 2, contrast could only increase
function migrateLegacyContrast( filters: any ): void {
    const value = filters.c;

    const oldMultiplier = Math.pow( value + 1, 2 );
    const slope = ( MAX_CONTRAST - MIN_CONTRAST ) / 0.5;

    const newValue = 0.5 + ( oldMultiplier - MIN_CONTRAST ) / slope;

    filters.c = Math.min( 1, Math.max( 0.5, newValue ));
}

// prior to FACTORY_VERSION 2, HSL values were not in normalised range
function migrateLegacyHSL( filters: any ): void {
    const legacyHue = filters.hh;
    const legacySat = filters.hs;
    const legacyLightness = filters.hl;

    filters.hh = mapRange( legacyHue, -180, 180, 0, 1 );
    filters.hs = mapRange( legacySat, -1, 1, 0, 1 );
    filters.hl = mapRange( legacyLightness, -1, 1, 0, 1 );
}