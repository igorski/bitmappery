import { it, describe, expect } from "vitest";
import TransformationsFactory, { isEqual } from "@/factories/transformations-factory";

describe( "Transformations factory", () => {
    describe( "when creating a new Transformations list", () => {
        it( "should create a default Transformations structure when no arguments are passed", () => {
            const transformations = TransformationsFactory.create();
            expect( transformations ).toEqual({
                mirrorX: false,
                mirrorY: false,
                rotation: expect.any( Number ),
                scale: 1
            });
        });

        it( "should be able to create a Transformations list from given arguments", () => {
            const transformations = TransformationsFactory.create({
                mirrorX: true,
                mirrorY: true,
                rotation: -90,
                scale: 2
            });
            expect( transformations ).toEqual({
                mirrorX: true,
                mirrorY: true,
                rotation: -90,
                scale: 2
            });
        });
    });

    describe( "when serializing and deserializing a Transformations list", () => {
        it( "should do so without data loss", async () => {
            const transformations = TransformationsFactory.create({
                mirrorX: true,
                mirrorY: true,
                rotation: 270,
                scale: .5
            });
            const serialized = TransformationsFactory.serialize( transformations );
            const deserialized = TransformationsFactory.deserialize( serialized );

            expect( deserialized ).toEqual( transformations );
        });
    });

    it( "should know when two transformations instances are equal", () => {
        const defaultTransformations = TransformationsFactory.create();
        [ "mirrorX", "mirrorY", "rotation" ].forEach( property => {
            const transformations = TransformationsFactory.create({ [ property ]: 1 });
            expect( isEqual( transformations, defaultTransformations )).toBe( false );
        });
        expect( isEqual( defaultTransformations, TransformationsFactory.create() )).toBe( true );
    });
});
