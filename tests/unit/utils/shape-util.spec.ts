import { it, describe, expect } from "vitest";
import {
    shapeToRectangle, rectangleToShape,
    isShapeRectangular, isShapeClosed, mergeShapes, getConvexHull
} from "@/utils/shape-util";

describe( "Shape utilities", () => {
    it( "should be able to calculate the bounding box of the shape", () => {
        const shape = [
            { x: 100, y: 150 },
            { x: 50,  y: 899 },
            { x: 50,  y: 100 },
            { x: 101, y: 100 }
        ];
        expect( shapeToRectangle( shape )).toEqual({
            left: 50,
            top: 100,
            width: 51,
            height: 799
        });
    });

    it( "should be able to convert a rectangle into a valid list of shape coordinates", () => {
        expect( rectangleToShape( 400, 300, 50, 75 )).toEqual([
            { x: 50,  y: 75 },
            { x: 450, y: 75 },
            { x: 450, y: 375 },
            { x: 50,  y: 375 },
            { x: 50,  y: 75 }
        ]);
    });

    describe(" when determining whether a shape is rectangular", () => {
        it( "should recognize unclosed shapes", () => {
            expect( isShapeRectangular([
                { x: 50,  y: 50 },
                { x: 250, y: 50 },
                { x: 250, y: 150 },
                { x: 50,  y: 150 }
            ])).toBe( false );
        });

        it( "should recognize non-rectangular shapes", () => {
            expect( isShapeRectangular([
                { x: 50,  y: 50 },
                { x: 250, y: 50 },
                { x: 150, y: 150 },
                { x: 50,  y: 150 },
                { x: 50,  y: 50 }
            ])).toBe( false );

            expect( isShapeRectangular([
                { x: 50,  y: 50 },
                { x: 250, y: 50 },
                { x: 250, y: 150 },
                { x: 50,  y: 75 },
                { x: 50,  y: 50 }
            ])).toBe( false );
        });

        it( "should recognize a rectangular shape", () => {
            expect( isShapeRectangular([
                { x: 50,  y: 50 },
                { x: 250, y: 50 },
                { x: 250, y: 150 },
                { x: 50,  y: 150 },
                { x: 50,  y: 50 }
            ])).toBe( true );
        });
    });

    describe( "when determining whether a shape is closed", () => {
        it( "should not consider a shape with less than four points closable", () => {
            const shape = [{ x: 100, y: 150 }];
            expect( isShapeClosed( shape )).toBe( false );
            shape.push({ x: 150, y: 150 });
            expect( isShapeClosed( shape )).toBe( false );
            shape.push({ x: 100, y: 200 });
            expect( isShapeClosed( shape )).toBe( false );
        });

        it( "should not consider a shape where the first and last point are not at the same coordinate as closed", () => {
            const shape = [
                { x: 100, y: 150 },
                { x: 150, y: 150 },
                { x: 100, y: 200 },
                { x: 100, y: 160 }
            ];
            expect( isShapeClosed( shape )).toBe( false );
        });

        it( "should consider a shape where the first and last point are at the same coordinate as closed", () => {
            const shape = [
                { x: 100, y: 150 },
                { x: 150, y: 150 },
                { x: 100, y: 200 },
                { x: 100, y: 150 }
            ];
            expect( isShapeClosed( shape )).toBe( true );
        });
    });

    describe( "when merging overlapping Shapes", () => {
        // box { top: 1, left: 1, width: 5, height: 5 }
        const shapeA: Shape = [
            { x: 1, y: 1 },
            { x: 6, y: 1 },
            { x: 6, y: 6 },
            { x: 6, y: 1 }
        ];
        // triangle /\
        const shapeB: Shape = [
            { x: 0,   y: 0 },
            { x: 7,   y: 0 },
            { x: 3.5, y: 7 }
        ];

        it.skip( "should be able to merge overlapping Shapes into a single Shape", () => {
            expect( mergeShapes( shapeA, shapeB )).toEqual([
                { x: 0,   y: 0 },
                { x: 7,   y: 0 },
                { x: 6,   y: 2 },
                { x: 6,   y: 6 },
                { x: 4,   y: 6 },
                { x: 3.5, y: 7 },
                { x: 3,   y: 6 },
                { x: 1,   y: 6 },
                { x: 1,   y: 2 },
                { x: 0,   y: 0 }
            ]);
        });

        it( "should be able to calculate the convex hull of a Shape", () => {
            const shape: Shape = [
                { x: 1, y: 1 },
                { x: 6, y: 1 },
                { x: 6, y: 6 },
                { x: 6, y: 1 }
            ];
            console.log('convex hull',getConvexHull(shape));
            expect( getConvexHull( shape )).toEqual([
                { x: 1, y: 1 },
                { x: 6, y: 1 },
                { x: 6, y: 6 },
                { x: 6, y: 1 }
            ]);
        });
    });
});
