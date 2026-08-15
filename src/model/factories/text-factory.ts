/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2026 - https://www.igorski.nl
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
import type { Text } from "@/model/types/text";

import { loadGoogleFont } from "@/services/font-service";
import { googleFonts } from "@/definitions/font-types";

export type TextProps = Partial<Text>;

export const FACTORY_VERSION = 2;

const TextFactory = {
    create({
        value = "",
        font = googleFonts[ 0 ],
        size = 24,
        unit = "px",
        lineHeight = 0.5,
        spacing = 0.5,
        color = "red"
    }: TextProps = {}): Text {
        return {
            value,
            font,
            size,
            unit,
            lineHeight,
            spacing,
            color,
        };
    },

    /**
     * Saving text properties into a simplified JSON structure
     * for project storage
     */
    serialize( text: Text ): any {
        return {
            f: text.font,
            v: text.value,
            s: text.size,
            u: text.unit,
            l: text.lineHeight,
            p: text.spacing,
            c: text.color,
            fv: FACTORY_VERSION,
        };
    },

    /**
     * Creating a new text instance from a stored text structure
     * inside a stored projects layer
     */
     async deserialize( text: any = {} ): Promise<Text> {
        const serializedVersion = text.fv ?? 1;

        if ( serializedVersion === 2 ) { // @todo should be 1
            migrateLegacySpacingAndLineHeight( text );
        }
         const font = text.f;
         try {
             await loadGoogleFont( font ); // ensure font is loaded and ready
         } catch {
             console.log( `Could not load font "${font}", continuing with fallback font.` );
         }
         return TextFactory.create({
             font,
             value: text.v,
             size: text.s,
             unit: text.u,
             lineHeight: text.l,
             spacing: text.p,
             color: text.c,
         });
     }
};
export default TextFactory;

export const isEqual = ( text: Text, textToCompare?: Text ): boolean => {
    if ( !textToCompare ) {
        return false;
    }
    return text.font       === textToCompare.font &&
           text.value      === textToCompare.value &&
           text.size       === textToCompare.size &&
           text.unit       === textToCompare.unit &&
           text.lineHeight === textToCompare.lineHeight &&
           text.spacing    === textToCompare.spacing &&
           text.color      === textToCompare.color;
};

/* internal methods */

// MIGRATIONS transform text values serialised in a legacy factory format
// which have since been changed in the application. Migrations aim to keep the
// visual result of the legacy properties equal to the new format

// prior to FACTORY_VERSION 2, line height and spacing did not use a normalised scale with a neutral center
function migrateLegacySpacingAndLineHeight( text: any ): void {
    // 172 were the max values for spacing and lineHeight
    console.info("--- migrate text legacyy");

    if ( text.l === 0 ) {
        text.l = 0.5;
    } else {
console.info('need to transform lineHeight:'+text.l);text.l = 0.5;
    }

    if ( text.p === 0 ) {
        text.p = 0;
    } else {
console.info('need to transform spacing:'+text.p);text.p = 0.5;
    }
}