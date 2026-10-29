/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
import { type Mask } from "@/model/types/mask";
import { imageToBase64, base64toCanvas } from "@/utils/canvas-util";

export type MaskProps = Partial<Mask>;

const MaskFactory = {
    create({
        source = null,
        enabled = true,
        x = 0,
        y = 0,
    }): Mask {
        return {
            source,
            enabled,
            x,
            y,
        };
    },

    serialize( mask: Mask, width: number, height: number ): any {
        return {
            s: imageToBase64( mask.source, width, height, true ),
            e: mask.enabled,
            x: mask.x,
            y: mask.y,
            w: width,
            h: height,
        };
    },

    async deserialize( mask: any ): Promise<Mask> {
        const source = await base64toCanvas( mask.s, mask.w, mask.h );
        return {
            source,
            enabled: mask.e,
            x: mask.x,
            y: mask.y,
        };
    },
};

export default MaskFactory;