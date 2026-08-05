import { it, describe, expect } from "vitest";
import {
    getHSLValue, getValue,
    MAX_CONTRAST,
    MIN_EXPOSURE, MAX_EXPOSURE,
    MIN_HUE, MAX_HUE,
    MIN_SATURATION, MAX_SATURATION,
    MIN_LIGHTNESS, MAX_LIGHTNESS,
} from "@/definitions/filter-ranges";
import { type Filters } from "@/model/types/filters";
import FiltersFactory from "@/model/factories/filters-factory";

describe( "filter-ranges", () => {
    describe( "getValue function", () => {
        it( "should multiply brightness", () => {
            expect( getValue( FiltersFactory.create({ brightness: 0.5 }), "brightness" )).toEqual( 1 );
            expect( getValue( FiltersFactory.create({ brightness: 1 }), "brightness" )).toEqual( 2 );
        });

        it( "should map the contrast range using split linear mapping", () => {
            expect( getValue( FiltersFactory.create({ contrast: 0.5 }), "contrast" )).toEqual( 1 );
            expect( getValue( FiltersFactory.create({ contrast: 0 }), "contrast" )).toEqual( 0 );
            expect( getValue( FiltersFactory.create({ contrast: 1 }), "contrast" )).toEqual( MAX_CONTRAST );
        });

        it( "should map the gamma range", () => {
            expect( getValue( FiltersFactory.create({ gamma: 0.5 }), "gamma" )).toEqual( 1 );
            expect( getValue( FiltersFactory.create({ gamma: 0 }), "gamma" )).toEqual( 0 );
            expect( getValue( FiltersFactory.create({ gamma: 1 }), "gamma" )).toEqual( 2 );
        });

        it( "should map the vibrance range", () => {
            expect( getValue( FiltersFactory.create({ vibrance: 0.5 }), "vibrance" )).toEqual( -0 );
            expect( getValue( FiltersFactory.create({ vibrance: 0 }), "vibrance" )).toEqual( 100 );
            expect( getValue( FiltersFactory.create({ vibrance: 1 }), "vibrance" )).toEqual( -100 );
        });

        it( "should map the exposure range", () => {
            expect( getValue( FiltersFactory.create({ exposure: 0.5 }), "exposure" )).toEqual( 0 );
            expect( getValue( FiltersFactory.create({ exposure: 0 }), "exposure" )).toEqual( MIN_EXPOSURE );
            expect( getValue( FiltersFactory.create({ exposure: 1 }), "exposure" )).toEqual( MAX_EXPOSURE );
        });

        it( "should return values for non-mapped properties unchanged", () => {
            const MAPPED_PROPS = [ "brightness", "contrast", "gamma", "vibrance", "exposure" ];

            const filters = FiltersFactory.create();
            
            const keys = Object.keys( filters )
                .filter( key => !MAPPED_PROPS.includes( key )) as ( keyof Filters )[];
            
            for ( const key of keys ) {
                expect( getValue( filters, key )).toEqual( filters[ key ]);
            }
        });
    });

    describe( "getHSLValue function", () => {
        it( "should return the appropriate value for the normalised neutral", () => {
            expect( getHSLValue( 0.5, 0.5, 0.5 )).toEqual({ hue: 0, saturation: 0, lightness: 0 });
        });

        it( "should return the appropriate value for the lowest value", () => {
            expect( getHSLValue( 0, 0, 0 )).toEqual({
                hue: MIN_HUE, saturation: MIN_SATURATION, lightness: MIN_LIGHTNESS,
            });
        });

        it( "should return the appropriate value for the maximum value", () => {
            expect( getHSLValue( 1, 1, 1 )).toEqual({
                hue: MAX_HUE, saturation: MAX_SATURATION, lightness: MAX_LIGHTNESS,
            });
        });
    });
});