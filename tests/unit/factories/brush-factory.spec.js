import { it, describe, expect } from "vitest";
import BrushFactory from "@/factories/brush-factory";

describe( "Brush factory", () => {
    it( "should be able to create a default brush when no arguments are given", () => {
        expect( BrushFactory.create()).toEqual({
            radius: 10,
            halfRadius: 5,
            doubleRadius: 20,
            colors: [
                "rgba(255,0,0,1)",
                "rgba(255,0,0,0.5)",
                "rgba(255,0,0,0)"
            ],
            options: {},
            pointers: [],
            down: false,
        });
    });

    it( "should be able to create a brush from given arguments", () => {
        expect( BrushFactory.create({
            radius: 20,
            color: "rgba(128,123,686,.75)",
            pointers: [{ x: 10, y: 20 }],
            options: { size: 10 }
        })).toEqual({
            radius: 20,
            halfRadius: 10,
            doubleRadius: 40,
            colors: [
                "rgba(128,123,686,.75)",
                "rgba(128,123,686,0.375)",
                "rgba(128,123,686,0)"
            ],
            pointers: [{ x: 10, y: 20 }],
            options: { size: 10 },
            down: false,
        });
    });
});
