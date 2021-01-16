import { translatePoints } from "@/math/point-math";

describe( "Point math", () => {
    it( "should be able to translate the coordinates within a list", () => {
        const list = [
            { x: 10, y: 10 }, { x: 15, y: 15 }
        ];
        expect( translatePoints( list, 5, -5 )).toEqual([
            { x: 15, y: 5 }, { x: 20, y: 10 }
        ]);
    });
});
