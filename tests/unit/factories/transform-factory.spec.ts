import { it, describe, expect } from "vitest";
import TransformFactory, { isEqual } from "@/factories/transform-factory";

describe( "Transform factory", () => {
    describe( "when creating a new Transform instance", () => {
        it( "should create a default Transform structure when no arguments are passed", () => {
            const transform = TransformFactory.create();
            expect( transform ).toEqual({
                mirrorX: false,
                mirrorY: false,
                rotation: expect.any( Number ),
                scale: 1
            });
        });

        it( "should be able to create a Transform instance from given arguments", () => {
            const transform = TransformFactory.create({
                mirrorX: true,
                mirrorY: true,
                rotation: -90,
                scale: 2
            });
            expect( transform ).toEqual({
                mirrorX: true,
                mirrorY: true,
                rotation: -90,
                scale: 2
            });
        });
    });

    describe( "when serializing and deserializing a Transform instance", () => {
        it( "should do so without data loss", async () => {
            const transform = TransformFactory.create({
                mirrorX: true,
                mirrorY: true,
                rotation: 270,
                scale: .5
            });
            const serialized = TransformFactory.serialize( transform );
            const deserialized = TransformFactory.deserialize( serialized );

            expect( deserialized ).toEqual( transform );
        });
    });

    it( "should know when two Transform instances are equal", () => {
        const defaultTransform = TransformFactory.create();
        [ "mirrorX", "mirrorY", "rotation" ].forEach( property => {
            const transform = TransformFactory.create({ [ property ]: 1 });
            expect( isEqual( transform, defaultTransform )).toBe( false );
        });
        expect( isEqual( defaultTransform, TransformFactory.create() )).toBe( true );
    });
});
