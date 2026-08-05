import { it, describe, expect } from "vitest";
import { getValue, MIN_EXPOSURE, MAX_EXPOSURE } from "@/definitions/filter-ranges";
import { type Filters } from "@/model/types/filters";
import FiltersFactory from "@/model/factories/filters-factory";

describe( "filter-ranges", () => {
    it( "should multiply brightness", () => {
        expect( getValue( FiltersFactory.create({ brightness: 0.5 }), "brightness" )).toEqual( 1 );
        expect( getValue( FiltersFactory.create({ brightness: 1 }), "brightness" )).toEqual( 2 );
    });

    it( "should map the contrast range", () => {
        expect( getValue( FiltersFactory.create({ contrast: 0 }), "contrast" )).toEqual( 1 );
        expect( getValue( FiltersFactory.create({ contrast: 1 }), "contrast" )).toEqual( 4 );
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

    it( "should apply a normalised range to exposure", () => {
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