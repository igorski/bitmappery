/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2024 - https://www.igorski.nl
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
        desaturate = false
    }: FiltersProps = {}): Filters {
        return {
            enabled,
            blendMode,
            opacity,
            gamma,
            brightness,
            contrast,
            desaturate,
            vibrance,
            threshold,
        };
    },

    /**
     * Saving filter properties into a simplified JSON structure
     * for project storage
     */
    serialize( filters: Filters ): any {
        return {
            e: filters.enabled,
            m: filters.blendMode,
            o: filters.opacity,
            g: filters.gamma,
            b: filters.brightness,
            c: filters.contrast,
            d: filters.desaturate,
            v: filters.vibrance,
            t: filters.threshold,
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
           filters.vibrance   === filtersToCompareTo.vibrance   &&
           filters.threshold  === filtersToCompareTo.threshold;
};
