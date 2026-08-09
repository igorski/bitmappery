import { it, describe, expect } from "vitest";
import {
    denormalise, normalise,
    normaliseHue, normaliseSaturation, normaliseLightness,
    denormaliseHue, denormaliseSaturation, denormaliseLightness,
    MAX_BRIGHTNESS, MAX_CONTRAST, MAX_GAMMA,
    MIN_EXPOSURE, MAX_EXPOSURE,
    MIN_HUE, MAX_HUE,
    MIN_SATURATION, MAX_SATURATION,
    MIN_LIGHTNESS, MAX_LIGHTNESS,
} from "@/definitions/filter-ranges";
import { type Filters } from "@/model/types/filters";
import FiltersFactory from "@/model/factories/filters-factory";

describe( "filter-ranges", () => {
    describe( "denormalise function", () => {
        it( "should multiply brightness", () => {
            expect( denormalise( FiltersFactory.create({ brightness: 0.5 }), "brightness" )).toEqual( 1 );
            expect( denormalise( FiltersFactory.create({ brightness: 0 }), "brightness" )).toEqual( 0 );
            expect( denormalise( FiltersFactory.create({ brightness: 1 }), "brightness" )).toEqual( MAX_BRIGHTNESS );
        });

        it( "should map the contrast range using split linear mapping", () => {
            expect( denormalise( FiltersFactory.create({ contrast: 0.5 }), "contrast" )).toEqual( 1 );
            expect( denormalise( FiltersFactory.create({ contrast: 0 }), "contrast" )).toEqual( 0 );
            expect( denormalise( FiltersFactory.create({ contrast: 1 }), "contrast" )).toEqual( MAX_CONTRAST );
        });

        it( "should map the gamma range", () => {
            expect( denormalise( FiltersFactory.create({ gamma: 0.5 }), "gamma" )).toEqual( 1 );
            expect( denormalise( FiltersFactory.create({ gamma: 0 }), "gamma" )).toEqual( 0 );
            expect( denormalise( FiltersFactory.create({ gamma: 1 }), "gamma" )).toEqual( MAX_GAMMA );
        });

        it( "should map the vibrance range", () => {
            expect( denormalise( FiltersFactory.create({ vibrance: 0.5 }), "vibrance" )).toEqual( -0 );
            expect( denormalise( FiltersFactory.create({ vibrance: 0 }), "vibrance" )).toEqual( 100 );
            expect( denormalise( FiltersFactory.create({ vibrance: 1 }), "vibrance" )).toEqual( -100 );
        });

        it( "should map the exposure range", () => {
            expect( denormalise( FiltersFactory.create({ exposure: 0.5 }), "exposure" )).toEqual( 0 );
            expect( denormalise( FiltersFactory.create({ exposure: 0 }), "exposure" )).toEqual( MIN_EXPOSURE );
            expect( denormalise( FiltersFactory.create({ exposure: 1 }), "exposure" )).toEqual( MAX_EXPOSURE );
        });

        it( "should return values for non-mapped properties unchanged", () => {
            const MAPPED_PROPS = [ "brightness", "contrast", "gamma", "vibrance", "exposure" ];

            const filters = FiltersFactory.create();
            
            const keys = Object.keys( filters )
                .filter( key => !MAPPED_PROPS.includes( key )) as ( keyof Filters )[];
            
            for ( const key of keys ) {
                expect( denormalise( filters, key )).toEqual( filters[ key ]);
            }
        });
    });

    describe( "normalise function", () => {
        it( "should divide brightness", () => {
            expect( normalise( "brightness", 1 )).toEqual( 0.5 );
            expect( normalise( "brightness", 0 )).toEqual( 0 );
            expect( normalise( "brightness", MAX_BRIGHTNESS )).toEqual( 1 );
        });

        it( "should map the contrast range using split linear mapping", () => {
            expect( normalise( "contrast", 1 )).toEqual( 0.5 );
            expect( normalise( "contrast", 0 )).toEqual( 0 );
            expect( normalise( "contrast", MAX_CONTRAST )).toEqual( 1 );
        });

        it( "should divide the gamma range", () => {
            expect( normalise( "gamma", 1 )).toEqual( 0.5 );
            expect( normalise( "gamma", 0 )).toEqual( 0 );
            expect( normalise( "gamma", MAX_GAMMA )).toEqual( 1 );
        });

        it( "should map the vibrance range", () => {
            expect( normalise( "vibrance", -0 )).toEqual( 0.5 );
            expect( normalise( "vibrance", 100 )).toEqual( 0 );
            expect( normalise( "vibrance", -100 )).toEqual( 1 );
        });

        it( "should map the exposure range", () => {
            expect( normalise( "exposure", 0 )).toEqual( 0.5 );
            expect( normalise( "exposure", MIN_EXPOSURE )).toEqual( 0 );
            expect( normalise( "exposure", MAX_EXPOSURE )).toEqual( 1 );
        });

        it( "should return values for non-mapped properties unchanged", () => {
            const MAPPED_PROPS = [ "brightness", "contrast", "gamma", "vibrance", "exposure" ];

            const filters = FiltersFactory.create();
            
            const keys = Object.keys( filters )
                .filter( key => !MAPPED_PROPS.includes( key )) as ( keyof Filters )[];
            
            for ( const key of keys ) {
                expect( normalise( key, 0.75 )).toEqual( 0.75 );
            }
        });
    });

    describe( "when denormalising HSL values", () => {
        it( "should return the appropriate value for the normalised neutrals", () => {
            expect( denormaliseHue( 0.5 )).toEqual( 0 );
            expect( denormaliseSaturation( 0.5 )).toEqual( 0 );
            expect( denormaliseLightness( 0.5 )).toEqual( 0 );
        });

        it( "should return the appropriate value for the minimum value", () => {
            expect( denormaliseHue( 0 )).toEqual( MIN_HUE );
            expect( denormaliseSaturation( 0 )).toEqual( MIN_SATURATION );
            expect( denormaliseLightness( 0 )).toEqual( MIN_LIGHTNESS );
        });

        it( "should return the appropriate value for the maximum value", () => {
            expect( denormaliseHue( 1 )).toEqual( MAX_HUE );
            expect( denormaliseSaturation( 1 )).toEqual( MAX_SATURATION );
            expect( denormaliseLightness( 1 )).toEqual( MAX_LIGHTNESS );
        });
    });

    describe( "when normalising HSL values", () => {
        it( "should return the appropriate value for the neutrals", () => {
            expect( normaliseHue( 0 )).toEqual( 0.5 );
            expect( normaliseSaturation( 0 )).toEqual( 0.5 );
            expect( normaliseLightness( 0 )).toEqual( 0.5 );
        });

        it( "should return the appropriate value for the minimum value", () => {
            expect( normaliseHue( MIN_HUE )).toEqual( 0 );
            expect( normaliseSaturation( MIN_SATURATION )).toEqual( 0 );
            expect( normaliseLightness( MIN_LIGHTNESS )).toEqual( 0 );
        });

        it( "should return the appropriate value for the maximum value", () => {
            expect( normaliseHue( MAX_HUE )).toEqual( 1 );
            expect( normaliseSaturation( MAX_SATURATION )).toEqual( 1 );
            expect( normaliseLightness( MAX_LIGHTNESS )).toEqual( 1 );
        });
    });
});