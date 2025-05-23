/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
import type { Filters } from "@/definitions/document";

export type FiltersProps = Partial<Filters>;

export const DEFAULT_DUOTONE_1 = "#FF0000";
export const DEFAULT_DUOTONE_2 = "#0099FF";

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
        desaturate = false,
        invert     = false,
        duotone = {
            enabled: false,
            color1: DEFAULT_DUOTONE_1,
            color2: DEFAULT_DUOTONE_2,
        },
    }: FiltersProps = {}): Filters {
        return {
            enabled,
            blendMode,
            opacity,
            gamma,
            brightness,
            contrast,
            desaturate,
            invert,
            vibrance,
            threshold,
            duotone,
        };
    },

    /**
     * Saving filter properties into a simplified JSON structure
     * for project storage
     */
    serialize( filters: Filters ): any {
        const { duotone } = filters;
        return {
            e: filters.enabled,
            m: filters.blendMode,
            o: filters.opacity,
            g: filters.gamma,
            b: filters.brightness,
            c: filters.contrast,
            d: filters.desaturate,
            i: filters.invert,
            v: filters.vibrance,
            t: filters.threshold,
            de: duotone.enabled,
            d1: duotone.color1,
            d2: duotone.color2,
        };
    },

    /**
     * Creating a new filter list from a stored filters structure
     * inside a stored projects layer
     */
     deserialize( filters: any = {} ): Filters {
         return FiltersFactory.create({
             enabled: filters.e,
             blendMode: filters.m,
             opacity: filters.o,
             gamma: filters.g,
             brightness: filters.b,
             contrast: filters.c,
             desaturate: filters.d,
             vibrance: filters.v,
             threshold: filters.t,
             // these can be undefined as these were added in later app versions
             invert: filters.i ?? false,
             duotone: {
                enabled: filters.de ?? false,
                color1: filters.d1 ?? DEFAULT_DUOTONE_1,
                color2: filters.d2 ?? DEFAULT_DUOTONE_2,
             },
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
           filters.desaturate === filtersToCompareTo.desaturate &&
           filters.invert     === filtersToCompareTo.invert     &&
           filters.vibrance   === filtersToCompareTo.vibrance   &&
           filters.threshold  === filtersToCompareTo.threshold  &&
           filters.duotone.enabled === filtersToCompareTo.duotone.enabled &&
           filters.duotone.color1  === filtersToCompareTo.duotone.color1  &&
           filters.duotone.color2  === filtersToCompareTo.duotone.color2;
};
