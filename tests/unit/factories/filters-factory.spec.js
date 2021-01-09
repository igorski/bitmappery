import FiltersFactory, { hasFilters, isEqual } from "@/factories/filters-factory";

describe( "Filters factory", () => {
    describe( "when creating a new filter list", () => {
        it( "should create a default filter structure when no arguments are passed", () => {
            const filters = FiltersFactory.create();
            expect( filters ).toEqual({
                enabled: true,
                gamma: .5,
                brightness: .5,
                contrast: 0,
                vibrance: .5,
                desaturate: false,
            });
        });

        it( "should be able to create a filters list from given arguments", () => {
            const filters = FiltersFactory.create({
                enabled: false,
                gamma: .7,
                brightness: .6,
                contrast: .3,
                vibrance: .2,
                desaturate: true,
            });
            expect( filters ).toEqual({
                enabled: false,
                gamma: .7,
                brightness: .6,
                contrast: .3,
                vibrance: .2,
                desaturate: true,
            });
        });
    });

    describe( "when serializing and deserializing a filters list", () => {
        it( "should do so without data loss", async () => {
            const filters = FiltersFactory.create({
                enabled: false,
                gamma: .7,
                brightness: .6,
                contrast: .3,
                vibrance: .2,
                desaturate: true,
            });
            const serialized   = FiltersFactory.serialize( filters );
            const deserialized = FiltersFactory.deserialize( serialized );

            expect( deserialized ).toEqual( filters );
        });
    });

    describe( "when determining if a filter configuration deviates from the default (and thus requires processing)", () => {
        it( "should consider a configuration that is equal to the default as inactive", () => {
            const defaultFilter = FiltersFactory.create();
            expect( hasFilters( defaultFilter )).toBe( false );
        });

        it( "should consider a configuration where one of the properties deviates from the default as active", () => {
            let filter = FiltersFactory.create({ gamma: .7 });
            expect( hasFilters( filter )).toBe( true );

            filter = FiltersFactory.create({ brightness: .3 });
            expect( hasFilters( filter )).toBe( true );

            filter = FiltersFactory.create({ contrast: .6 });
            expect( hasFilters( filter )).toBe( true );

            filter = FiltersFactory.create({ vibrance: .4 });
            expect( hasFilters( filter )).toBe( true );

            filter = FiltersFactory.create({ desaturate: true });
            expect( hasFilters( filter )).toBe( true );
        });
    });

    it( "should know when two filters instances are equal", () => {
        const defaultFilter = FiltersFactory.create();
        [ "enabled", "gamma", "brightness", "contrast", "vibrance", "desaturate" ].forEach( property => {
            const filters = FiltersFactory.create({ [ property ]: 1 });
            expect( isEqual( filters, defaultFilter )).toBe( false );
        });
        expect( isEqual( defaultFilter, FiltersFactory.create() )).toBe( true );
    });
});
