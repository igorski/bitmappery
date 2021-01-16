import EffectsFactory, { isEqual } from "@/factories/effects-factory";

describe( "Effects factory", () => {
    describe( "when creating a new Effects list", () => {
        it( "should create a default Effects structure when no arguments are passed", () => {
            const effects = EffectsFactory.create();
            expect( effects ).toEqual({
                mirrorX: false,
                mirrorY: false,
                rotation: expect.any( Number ),
                scale: 1
            });
        });

        it( "should be able to create a Effects list from given arguments", () => {
            const effects = EffectsFactory.create({
                mirrorX: true,
                mirrorY: true,
                rotation: -90,
                scale: 2
            });
            expect( effects ).toEqual({
                mirrorX: true,
                mirrorY: true,
                rotation: -90,
                scale: 2
            });
        });
    });

    describe( "when serializing and deserializing a Effects list", () => {
        it( "should do so without data loss", async () => {
            const effects = EffectsFactory.create({
                mirrorX: true,
                mirrorY: true,
                rotation: 270,
                scale: .5
            });
            const serialized = EffectsFactory.serialize( effects );
            const deserialized = EffectsFactory.deserialize( serialized );

            expect( deserialized ).toEqual( effects );
        });
    });

    it( "should know when two effects instances are equal", () => {
        const defaultEffects = EffectsFactory.create();
        [ "mirrorX", "mirrorY", "rotation" ].forEach( property => {
            const effects = EffectsFactory.create({ [ property ]: 1 });
            expect( isEqual( effects, defaultEffects )).toBe( false );
        });
        expect( isEqual( defaultEffects, EffectsFactory.create() )).toBe( true );
    });
});
