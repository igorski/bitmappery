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

let UID_COUNTER = 0;

export type MaskProps = Partial<Omit<Mask, "id">>;

const MaskFactory = {
    create({
        source = null,
        enabled = true,
        left = 0,
        top = 0,
    }: MaskProps = {}): Mask {
        return {
            id: `mask_${( ++UID_COUNTER )}`,
            source,
            enabled,
            left,
            top,
        };
    },

    serialize( mask: Mask ): any {
        const { width, height } = mask.source;

        return {
            s: imageToBase64( mask.source, width, height, true ),
            e: mask.enabled,
            x: mask.left,
            y: mask.top,
            w: width,
            h: height,
        };
    },

    async deserialize( mask: any ): Promise<Mask> {
        const source = await base64toCanvas( mask.s, mask.w, mask.h );
        return MaskFactory.create({
            source,
            enabled: mask.e,
            left: mask.x,
            top: mask.y,
        });
    },
};

export default MaskFactory;