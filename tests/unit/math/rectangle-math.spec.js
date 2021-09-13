import { areEqual, scaleRectangle } from "@/math/rectangle-math";

describe( "Rectangle math utilities", () => {
    describe( "When determining the equality of two given rectangles", () => {
        it( "should recognize when two rectangles using left and top are equal or not", () => {
            const rect1 = { left: 10, top: 5, width: 100, height: 100 };
            const rect2 = { left: 0, top: 0, width: 0, height: 0 };

            expect( areEqual( rect1, rect2 )).toBe( false );

            rect2.left = rect1.left;
            expect( areEqual( rect1, rect2 )).toBe( false );

            rect2.top = rect1.top;
            expect( areEqual( rect1, rect2 )).toBe( false );

            rect2.width = rect1.width;
            expect( areEqual( rect1, rect2 )).toBe( false );

            rect2.height = rect1.height;
            expect( areEqual( rect1, rect2 )).toBe( true );
        });

        it( "should recognize when two rectangles using x and y are equal", () => {
            const rect1 = { x: 10, y: 5, width: 100, height: 100 };
            const rect2 = { x: 0, y: 0, width: 0, height: 0 };

            expect( areEqual( rect1, rect2 )).toBe( false );

            rect2.x = rect1.x;
            expect( areEqual( rect1, rect2 )).toBe( false );

            rect2.y = rect1.y;
            expect( areEqual( rect1, rect2 )).toBe( false );

            rect2.width = rect1.width;
            expect( areEqual( rect1, rect2 )).toBe( false );

            rect2.height = rect1.height;
            expect( areEqual( rect1, rect2 )).toBe( true );
        });
    });

    describe( "when scaling rectangles", () => {
        it( "should be able to scale a rectangle and maintain its relative offset when scaling up", () => {
            const rectangle = {
                left: 50,
                top: 50,
                width: 200,
                height: 400
            };
            expect( scaleRectangle( rectangle, 2 )).toEqual({
                left: -50,
                top: -150,
                width: 400,
                height: 800
            });
        });

        it( "should be able to scale a rectangle and maintain its relative offset when scaling down", () => {
            const rectangle = {
                left: -50,
                top: -150,
                width: 400,
                height: 800
            };
            expect( scaleRectangle( rectangle, 0.5 )).toEqual({
                left: 50,
                top: 50,
                width: 200,
                height: 400
            });
        });
    });
});
