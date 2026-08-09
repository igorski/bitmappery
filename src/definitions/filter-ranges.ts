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
import { mapRange } from "@/math/unit-math";
import type { Filters } from "@/model/types/filters";

export const MAX_BLUR = 50;

export const MAX_BRIGHTNESS = 2;
export const MAX_GAMMA = 2;

export const MIN_CONTRAST = 1;
export const MAX_CONTRAST = 3;

export const MIN_HUE = -180; // in degrees
export const MAX_HUE = 180; // in degrees

export const MIN_SATURATION = -1;
export const MAX_SATURATION = 1;

export const MIN_LIGHTNESS = -1;
export const MAX_LIGHTNESS = 1;

export const MIN_EXPOSURE = -3;
export const MAX_EXPOSURE = 3;

/**
 * Maps the normalised model values for Filters to scaled value ranges which
 * correspond with the parameters used by the respective filter process.
 */
export const denormalise = ( filters: Partial<Filters>, prop: keyof Filters ): any => {
    switch ( prop ) {
        default:
            return filters[ prop ];
        case "brightness":
            return filters.brightness * MAX_BRIGHTNESS;
        case "contrast":
            // contrast requires split linear mapping
            if ( filters.contrast <= 0.5 ) {
                return mapRange( filters.contrast, 0, 0.5, 0, 1 );
            }
            return mapRange( filters.contrast, 0.5, 1, MIN_CONTRAST, MAX_CONTRAST );
        case "exposure":
            return mapRange( filters.exposure, 0, 1, MIN_EXPOSURE, MAX_EXPOSURE );
        case "gamma":
            return filters.gamma * MAX_GAMMA;
        case "vibrance":
            return -(( filters.vibrance * 200 ) - 100 ); // becomes inversed normalised 100 to -100 range
    }
};

/**
 * Inverse of denormalise(), use when UI values for Filter properties need
 * to be mapped to their model values
 */
export const normalise = ( prop: keyof Filters, value: any ): any => {
    switch ( prop ) {
        default:
            return value;
        case "brightness":
        case "gamma":
            return value / 2;
        case "contrast":
            if ( value <= 1 ) {
                return mapRange( value, 0, 1, 0, 0.5 );
            }
            return mapRange( value, MIN_CONTRAST, MAX_CONTRAST, 0.5, 1 );
        case "exposure":
            return mapRange( value, MIN_EXPOSURE, MAX_EXPOSURE, 0, 1 );
        case "vibrance":
            return ( -value + 100 ) / 200;
    }
};

/* HSL is a nested series of props, provide unique methods for these */

export const denormaliseHue = ( normalisedHue: number ): number => mapRange( normalisedHue, 0, 1, MIN_HUE, MAX_HUE );
export const denormaliseSaturation = ( normalisedSaturation: number ): number => mapRange( normalisedSaturation, 0, 1, MIN_SATURATION, MAX_SATURATION );
export const denormaliseLightness = ( normalisedLightness: number ): number => mapRange( normalisedLightness, 0, 1, MIN_LIGHTNESS, MAX_LIGHTNESS );

export const normaliseHue = ( value: number ): number => mapRange( value, MIN_HUE, MAX_HUE, 0, 1 );
export const normaliseSaturation = ( value: number ): number => mapRange( value, MIN_SATURATION, MAX_SATURATION, 0, 1 );
export const normaliseLightness = ( value: number ): number => mapRange( value, MIN_LIGHTNESS, MAX_LIGHTNESS, 0, 1 );
