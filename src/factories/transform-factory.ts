/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
import type { Transform } from "@/definitions/document";

export type TransformProps = Partial<Transform>;

const TransformFactory = {
    create({ scale = 1, rotation = 0, mirrorX = false, mirrorY = false }: TransformProps = {}): Transform {
        return {
            scale,
            rotation,
            mirrorX,
            mirrorY,
        };
    },

    /**
     * Saving transformation properties into a simplified JSON structure
     * for project storage
     */
    serialize( data: Transform ): any {
        return {
            s: data.scale,
            r: data.rotation,
            x: data.mirrorX,
            y: data.mirrorY,
        };
    },

    /**
     * Creating a new transformations structure from a stored JSON structure
     * inside a stored projects layer
     */
     deserialize( data: any = {} ): Transform {
         return TransformFactory.create({
             scale    : data.s,
             rotation : data.r,
             mirrorX  : data.x,
             mirrorY  : data.y,
         });
     }
};
export default TransformFactory;

export const isEqual = ( data: Transform, dataToCompare?: Transform ): boolean => {
    if ( !dataToCompare ) {
        return false;
    }
    return data.scale    === dataToCompare.scale    &&
           data.rotation === dataToCompare.rotation &&
           data.mirrorX  === dataToCompare.mirrorX  &&
           data.mirrorY  === dataToCompare.mirrorY;
};
