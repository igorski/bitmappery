import { it, describe, expect } from "vitest";
import {
    denormalise, normalise,
    MIN_LINE_HEIGHT_FACTOR, MAX_LINE_HEIGHT_FACTOR,
    MIN_SPACING_FACTOR, MAX_SPACING_FACTOR,
} from "@/definitions/text-properties";
import { type Text } from "@/model/types/text";
import { mockZCanvas } from "../mocks";

mockZCanvas();

import TextFactory from "@/model/factories/text-factory";

describe( "Text properties", () => {
    describe( "denormalise function", () => {
        it( "should map the spacing range using split linear mapping", () => {
            expect( denormalise( TextFactory.create({ spacing: 0.5 }), "spacing" )).toEqual( 1 );
            expect( denormalise( TextFactory.create({ spacing: 0 }), "spacing" )).toEqual( MIN_SPACING_FACTOR );
            expect( denormalise( TextFactory.create({ spacing: 1 }), "spacing" )).toEqual( MAX_SPACING_FACTOR );
        });

        it( "should map the line height range using split linear mapping", () => {
            expect( denormalise( TextFactory.create({ lineHeight: 0.5 }), "lineHeight" )).toEqual( 1 );
            expect( denormalise( TextFactory.create({ lineHeight: 0 }), "lineHeight" )).toEqual( MIN_LINE_HEIGHT_FACTOR );
            expect( denormalise( TextFactory.create({ lineHeight: 1 }), "lineHeight" )).toEqual( MAX_LINE_HEIGHT_FACTOR );
        });

        it( "should return values for non-mapped properties unchanged", () => {
            const MAPPED_PROPS = [ "spacing", "lineHeight" ];

            const text = TextFactory.create();
            
            const keys = Object.keys( text )
                .filter( key => !MAPPED_PROPS.includes( key )) as ( keyof Text )[];
            
            for ( const key of keys ) {
                expect( denormalise( text, key )).toEqual( text[ key ]);
            }
        });
    });

    describe( "normalise function", () => {
        it( "should map the spacing range using split linear mapping", () => {
            expect( normalise( "spacing", 1 )).toEqual( 0.5 );
            expect( normalise( "spacing", MIN_SPACING_FACTOR )).toEqual( 0 );
            expect( normalise( "spacing", MAX_SPACING_FACTOR )).toEqual( 1 );
        });

        it( "should map the lineHeight range using split linear mapping", () => {
            expect( normalise( "lineHeight", 1 )).toEqual( 0.5 );
            expect( normalise( "lineHeight", MIN_LINE_HEIGHT_FACTOR )).toEqual( 0 );
            expect( normalise( "lineHeight", MAX_LINE_HEIGHT_FACTOR )).toEqual( 1 );
        });

        it( "should return values for non-mapped properties unchanged", () => {
            const MAPPED_PROPS = [ "spacing", "lineHeight" ];

            const text = TextFactory.create();
            
            const keys = Object.keys( text )
                .filter( key => !MAPPED_PROPS.includes( key )) as ( keyof Text )[];
            
            for ( const key of keys ) {
                expect( normalise( key, 0.75 )).toEqual( 0.75 );
            }
        });
    });
});