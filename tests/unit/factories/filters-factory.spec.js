import FiltersFactory, { hasFilters } from "@/factories/filters-factory";

describe( "Filters factory", () => {
    describe( "when creating a new filter list", () => {
        it( "should create a default filter structure when no arguments are passed", () => {
            const filters = FiltersFactory.create();
            expect( filters ).toEqual({
                levels: .5,
                contrast: 0,
                desaturate: false,
            });
        });

        it( "should be able to create a filters list from given arguments", () => {
            const filters = FiltersFactory.create({
                levels: .7,
                contrast: .3,
                desaturate: true,
            });
            expect( filters ).toEqual({
                levels: .7,
                contrast: .3,
                desaturate: true,
            });
        });
    });

    describe( "when serializing and deserializing a filters list", () => {
        it( "should do so without data loss", async () => {
            const filters = FiltersFactory.create({
                levels: .7,
                contrast: .3,
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
            let filter = FiltersFactory.create({ levels: .7 });
            expect( hasFilters( filter )).toBe( true );

            filter = FiltersFactory.create({ contrast: .3 });
            expect( hasFilters( filter )).toBe( true );

            filter = FiltersFactory.create({ desaturate: true });
            expect( hasFilters( filter )).toBe( true );
        });
    });
});
