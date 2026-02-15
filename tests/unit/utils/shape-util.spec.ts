import { it, describe, expect } from "vitest";
import {
    mergeShapes,
    rectangleToShape, scaleShape, shapeToRectangle, subtractShapes,
    isOverlappingShape, isShapeRectangular, isShapeClosed
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

    describe( "when detecting overlapping shapes", () => {
        it( "should return false for non-overlaps", () => {
            const shapeA = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }];
            const shapeB = [{ x: 10, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 5 }];

            expect( isOverlappingShape([ shapeA ], shapeB )).toBe( false );
        });

        it( "should return true for overlaps", () => {
            const shapeA = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }];
            const shapeB = [{ x: 9, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 10 }, { x: 5, y: 10 }, { x: 9, y: 5 }];

            expect( isOverlappingShape([ shapeA ], shapeB )).toBe( true );
        });
    });

    describe( "when merging a shape with a list of shapes", () => {
        it( "should be able to merge the overlapping shape with the underlying shape", () => {
            const existingShape = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }];
            const shapeToAdd = [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 5 }];

            const merged = mergeShapes([ existingShape ], shapeToAdd );

            expect( merged ).toEqual([
                [
                    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 10 },
                    { x: 10, y: 10 }, { x: 5, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
                ]
            ]);
        });

        it( "should be able to merge the overlapping shape with multiple underlying shapes", () => {
            const existingShapeA = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }];
            const existingShapeB = [{ x: 15, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 0 }];
            const shapeToAdd = [{ x: 5, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 0 }];

            const merged = mergeShapes([ existingShapeA, existingShapeB ], shapeToAdd );

            expect( merged ).toEqual([
                [
                    { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 15, y: 0 }, { x: 20, y: 0 }, { x: 25, y: 0 },
                    { x: 25, y: 10 }, { x: 20, y: 10 }, { x: 15, y: 10 }, { x: 10, y: 10 }, { x: 5, y: 10 }, { x: 0, y: 10 },
                    { x: 0, y: 0 },
                ]
            ]);
        });
    });

    describe( "when subtracting an overlapping shape from another", () => {
        it( "should be able to remove an overlapping edge and return a single shape", () => {
            const shapeA = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }];
            const shapeB = [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 5 }];
            
            const subtracted = subtractShapes([ shapeA ], shapeB );

            expect( subtracted ).toEqual([
                [
                    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }
                ]
            ]);
        });

        it( "should return multiple shapes when the overlapping area has split the other shape", () => {
            const shapeA = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }];
            const shapeB = [{ x: 3, y: 0 }, { x: 7, y: 0 }, { x: 7, y: 10 }, { x: 3, y: 10 }, { x: 3, y: 0 }];
            
            const subtracted = subtractShapes([ shapeA ], shapeB );

            expect( subtracted ).toEqual([
                [
                    { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
                ],
                [
                    { x: 7, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 7, y: 10 }, { x: 7, y: 0 },
                ]
            ]);
        });

        it( "should remove any holes from the subtracted shapes", () => {
            const shapeA = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }];
            const shapeB = [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 2 }];
            
            const subtracted = subtractShapes([ shapeA ], shapeB );

            // expect original shapeA to be the result (shapeB is an inner square, and thus a hole)
            expect ( subtracted ).toEqual([
                [
                    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }
                ],
            ]);
        });
    });
})
