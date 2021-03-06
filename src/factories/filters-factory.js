/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
let defaultFilters = null;

const FiltersFactory = {
    create({
        enabled    = true,
        opacity    = 1,
        gamma      = .5,
        brightness = .5,
        contrast   = 0,
        vibrance   = .5,
        desaturate = false
    } = {}) {
        return {
            enabled,
            opacity,
            gamma,
            brightness,
            contrast,
            desaturate,
            vibrance,
        };
    },

    /**
     * Saving filter properties into a simplified JSON structure
     * for project storage
     */
    serialize( filters ) {
        return {
            e: filters.enabled,
            o: filters.opacity,
            g: filters.gamma,
            b: filters.brightness,
            c: filters.contrast,
            d: filters.desaturate,
            v: filters.vibrance,
        };
    },

    /**
     * Creating a new filter list from a stored filters structure
     * inside a stored projects layer
     */
     deserialize( filters = {} ) {
         return FiltersFactory.create({
             enabled: filters.e,
             opacity: filters.o,
             gamma: filters.g,
             brightness: filters.b,
             contrast: filters.c,
             desaturate: filters.d,
             vibrance: filters.v,
         });
     }
};
export default FiltersFactory;

export const hasFilters = filters => {
    if ( !filters.enabled ) {
        return false;
    }
    if ( !defaultFilters ) {
        defaultFilters = FiltersFactory.create();
    }
    return !isEqual( filters, defaultFilters );
};

export const isEqual = ( filters, filtersToCompareTo = {} ) => {
    return filters.enabled    === filtersToCompareTo.enabled    &&
           filters.opacity    === filtersToCompareTo.opacity    &&
           filters.gamma      === filtersToCompareTo.gamma      &&
           filters.brightness === filtersToCompareTo.brightness &&
           filters.contrast   === filtersToCompareTo.contrast   &&
           filters.desaturate === filtersToCompareTo.desaturate &&
           filters.vibrance   === filtersToCompareTo.vibrance;
};
