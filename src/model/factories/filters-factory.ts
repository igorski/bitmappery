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
import { DeepPartial } from "@/model/types/_util";
import type { Filters } from "@/model/types/filters";

export type FiltersProps = DeepPartial<Filters>;

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
    hue: 0,
    sat: 0,
    lightness: 0,
};

let defaultFilters: Filters | null = null;

const FiltersFactory = {
    create({
        enabled    = true,
        blendMode  = BlendModes.NORMAL,
        opacity    = 1,
        gamma      = .5,
        brightness = .5,
        contrast   = 0,
        vibrance   = .5,
        threshold  = -1, // -1 == off, working range is 0 - 255
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
            v: filters.vibrance,
            t: filters.threshold,
            de: duotone.enabled,
            d1: duotone.color1,
            d2: duotone.color2,
            hh: hsl.hue,
            hs: hsl.sat,
            hl: hsl.lightness,
            bl: filters.blur,
        };
    },

    /**
     * Creating a new filter list from a stored filters structure
     * inside a stored projects layer
     */
     deserialize( filters: any = {} ): Filters {
        // nullish coalescing fallbacks as some properties were added in later app versions
        return FiltersFactory.create({
            enabled: filters.e,
            blendMode: filters.m,
            opacity: filters.o,
            gamma: filters.g,
            brightness: filters.b,
            contrast: filters.c,
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
                hue: filters.hh ?? 0,
                sat: filters.hs ?? 0,
                lightness: filters.hl ?? 0,
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
