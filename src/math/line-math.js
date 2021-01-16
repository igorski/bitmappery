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
export const calcPathSpline = ( nodes, node, splinePts, resolution = 32 ) => {
    const prev     = node - 1;
    const next     = node + 1;
    const nextNext = node + 2;

    const maxRes = resolution - 1;

    for ( let n = 0; n < resolution; ++n ) {
        const pt = {};
        const p  = n / maxRes;

        splinePts.push({
            x : nspline(
                    p,
                    nodes[ prev ].x,
                    nodes[ node ].x,
                    nodes[ next ].x,
                    nodes[ nextNext ]?.x
                ),
            y : nspline(
                    p,
                    nodes[ prev ].y,
                    nodes[ node ].y,
                    nodes[ next ].y,
                    nodes[ nextNext ]?.y
                ),
        });
    }
};

/* internal methods */

const CR00 = -0.5;
const CR01 =  1.5;
const CR02 = -1.5;
const CR03 =  0.5;
const CR10 =  1.0;
const CR11 = -2.5;
const CR12 =  2.0;
const CR13 = -0.5;
const CR20 = -0.5;
const CR21 =  0.0;
const CR22 =  0.5;
const CR23 =  0.0;
const CR30 =  0.0;
const CR31 =  1.0;
const CR32 =  0.0;
const CR33 =  0.0;

function nspline( x, f0, f1, f2, f3 ) {
	const c3 = CR00 * f0 + CR01 * f1 + CR02 * f2 + CR03 * f3;
	const c2 = CR10 * f0 + CR11 * f1 + CR12 * f2 + CR13 * f3;
	const c1 = CR20 * f0 + CR21 * f1 + CR22 * f2 + CR23 * f3;
	const c0 = CR30 * f0 + CR31 * f1 + CR32 * f2 + CR33 * f3;

	return (( c3 * x + c2 ) * x + c1 ) * x + c0;
}
