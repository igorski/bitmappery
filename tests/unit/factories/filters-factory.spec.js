import FiltersFactory from "@/factories/filters-factory";

describe( "Filters factory", () => {
    describe( "when creating a new filter list", () => {
        it( "should create a default filter structure when no arguments are passed", () => {
            const filters = FiltersFactory.create();
            expect( filters ).toEqual({
                levels: .5,
                contrast: 0,
            });
        });

        it( "should be able to create a filters list from given arguments", () => {
            const filters = FiltersFactory.create({
                levels: .7,
                contrast: .3,
            });
            expect( filters ).toEqual({
                levels: .7,
                contrast: .3,
            });
        });
    });

    describe( "when serializing and deserializing a filters list", () => {
        it( "should do so without data loss", async () => {
            const filters = FiltersFactory.create({
                levels: .7,
                contrast: .3,
            });
            const serialized   = FiltersFactory.serialize( filters );
            const deserialized = FiltersFactory.deserialize( serialized );

            expect( deserialized ).toEqual( filters );
        });
    });
});
