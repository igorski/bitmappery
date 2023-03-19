import { it, describe, expect } from "vitest";
import { areEqual, scaleRectangle } from "@/math/rectangle-math";

describe( "Rectangle math utilities", () => {
    it( "should recognize equality between two given rectangles", () => {
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
