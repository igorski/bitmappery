import { it, describe, expect } from "vitest";
import {
    shapeToRectangle, rectangleToShape, scaleShape,
    isShapeRectangular, isShapeClosed
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

    it( "should be able to scale a Shape by given factor", () => {
        const shape = [
            { x: 100, y: 150 },
            { x: 50,  y: 899 },
            { x: 50,  y: 100 },
            { x: 101, y: 100 }
        ];
        expect( scaleShape( shape, 2 )).toEqual([
            { x: 200, y: 300 },
            { x: 100, y: 1798 },
            { x: 100, y: 200 },
            { x: 202, y: 200 }
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
});
