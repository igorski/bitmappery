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
import type { Brush, BrushToolOptions } from "@/definitions/editor";

type BrushProps = Partial<Brush> & {
    color?: string;
    options?: BrushToolOptions;
};

const BrushFactory = {
    create({ radius = 10, color = "rgba(255,0,0,1)", pointers = [], options = {} }: BrushProps = {} ): Brush {
        const [r, g, b, a] = color.split( "," );
        const colors = [
            color,
            `${r},${g},${b},${parseFloat(a) * 0.5})`,
            `${r},${g},${b},0)`
        ];
        return {
            radius,
            colors,
            pointers,
            options, // provided by tool-module
            halfRadius   : radius * 0.5,
            doubleRadius : radius * 2,
            down : false
        };
    }
};
export default BrushFactory;

export const createDrawable = ( brush: Brush, ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1 ): CanvasGradient => {
    const gradient = ctx.createRadialGradient( x, y, brush.halfRadius * scale, x, y, brush.radius * scale );
    const { thickness } = brush.options;

    gradient.addColorStop( 0, brush.colors[ 0 ]);
    gradient.addColorStop( thickness, brush.colors[ 1 ]);
    gradient.addColorStop( 1, brush.colors[ 2 ]);

    return gradient;
};
