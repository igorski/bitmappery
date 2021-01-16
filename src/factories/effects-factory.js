/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
const EffectFactory = {
    create({ scale = 1, rotation = 0, mirrorX = false, mirrorY = false } = {}) {
        return {
            scale,
            rotation,
            mirrorX,
            mirrorY,
        };
    },

    /**
     * Saving effects properties into a simplified JSON structure
     * for project storage
     */
    serialize( effects ) {
        return {
            s: effects.scale,
            r: effects.rotation,
            x: effects.mirrorX,
            y: effects.mirrorY,
        };
    },

    /**
     * Creating a new effects lists from a stored effects structure
     * inside a stored projects layer
     */
     deserialize( effects = {} ) {
         return EffectFactory.create({
             scale    : effects.s,
             rotation : effects.r,
             mirrorX  : effects.x,
             mirrorY  : effects.y,
         });
     }
};
export default EffectFactory;

export const isEqual = ( effects, effectsToCompare = {} ) => {
    return effects.scale    === effectsToCompare.scale    &&
           effects.rotation === effectsToCompare.rotation &&
           effects.mirrorX  === effectsToCompare.mirrorX  &&
           effects.mirrorY  === effectsToCompare.mirrorY;
};
