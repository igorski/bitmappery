import { areEqual } from "@/math/rectangle-math";

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
});
