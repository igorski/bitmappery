/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
import { googleFonts } from "@/services/font-service";

const TextFactory = {
    create({
        font = googleFonts[ 0 ],
        value = "",
        size = 16,
        lineHeight = 0,
        spacing = 0,
        color = "red"
    } = {}) {
        return {
            font,
            lineHeight,
            spacing,
            value,
            size,
            color,
        };
    },

    /**
     * Saving text properties into a simplified JSON structure
     * for project storage
     */
    serialize( text ) {
        return {
            f: text.font,
            v: text.value,
            s: text.size,
            l: text.lineHeight,
            p: text.spacing,
            c: text.color,
        };
    },

    /**
     * Creating a new text instance from a stored text structure
     * inside a stored projects layer
     */
     deserialize( text = {} ) {
         return TextFactory.create({
             font: text.f,
             value: text.v,
             size: text.s,
             lineHeight: text.l,
             spacing: text.p,
             color: text.c,
         });
     }
};
export default TextFactory;
