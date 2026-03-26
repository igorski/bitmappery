/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl, adapter from source of:
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
export const DPI   = [ 72, 97, 150, 300, 600 ] as const;
export const UNITS = [ "px", "in", "cm", "mm" ] as const;
export const DEFAULT_DPI = DPI[ 0 ];
export const DEFAULT_UNIT = UNITS[ 0 ];

export type Unit = ( typeof UNITS )[ number ];

/**
 * NOTE: width and height are ALWAYS provided in pixels (note these
 * must match the optionally provided DPI - defaults to DEFAULT_DPI)
 * The value for unit is used only as a hint for presentation layers
 * (which will convert the pixel value to the appropriate value for the unit)
 */
export type PresetValue = {
    width: number;
    height: number;
    dpi?: number;
    unit: Unit;
};

export const DefaultPresets: Record<string, PresetValue> = {
    DEFAULT: { unit: "px", width: 1000, height: 1000 },
    A6: { unit: "cm", width: 1240, height: 1748, dpi: 300 }, // 104 x 148 mm
    A5: { unit: "cm", width: 1748, height: 2480, dpi: 300 }, // 148 x 210 mm
    A4: { unit: "cm", width: 2480, height: 3508, dpi: 300 }, // 210 x 297 mm
    A3: { unit: "cm", width: 3508, height: 4961, dpi: 300 }, // 297 x 420 mm
    US_LETTER: { unit: "in", width: 2550, height: 3300, dpi: 300 }, // 8,5" x 11"
    US_LEGAL: { unit: "in", width: 2550, height: 4200, dpi: 300 }, // 8,5" x 11"
    US_TABLOID: { unit: "in", width: 3300, height: 5100, dpi: 300 }, // 11" x 17"
} as const;

export const TimelinePresets: Record<string, PresetValue> = {
    PIXEL_16: { unit: "px", width: 16, height: 16 },
    PIXEL_32: { unit: "px", width: 32, height: 32 },
    PIXEL_64: { unit: "px", width: 64, height: 64 },
    SMALL: { unit: "px", width: 512, height: 512 },
    MEDIUM: { unit: "px", width: 1024, height: 1024 },
    LARGE: { unit: "px", width: 1920, height: 1920 },
} as const;

export const AllPresets: Record<string, PresetValue> = {
    ...DefaultPresets,
    ...TimelinePresets,
} as const;
