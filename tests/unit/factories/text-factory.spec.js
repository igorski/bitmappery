import TextFactory, { isEqual } from "@/factories/text-factory";
import { googleFonts } from "@/definitions/font-types";

let mockUpdateFn;
jest.mock( "@/services/font-service", () => ({
    loadGoogleFont: (...args) => mockUpdateFn?.( "loadGoogleFont", ...args ),
}));

describe( "Text factory", () => {
    describe( "when creating a new Text instance", () => {
        it( "should create a default Text structure when no arguments are passed", () => {
            const text = TextFactory.create();
            expect( text ).toEqual({
                size: expect.any( Number ),
                lineHeight: expect.any( Number ),
                spacing: 0,
                value: "",
                font: googleFonts[ 0 ],
                color: "red",
            });
        });

        it( "should be able to create a Text structure from given arguments", () => {
            const text = TextFactory.create({
                size: 10,
                lineHeight: 30,
                spacing: 50,
                font: "Helvetica",
                value: "Foo bar baz",
                color: "#FF00AE"
            });
            expect( text ).toEqual({
                size: 10,
                lineHeight: 30,
                spacing: 50,
                font: "Helvetica",
                value: "Foo bar baz",
                color: "#FF00AE"
            });
        });
    });

    describe( "when serializing and deserializing a Text structure", () => {
        it( "should do so without data loss", async () => {
            mockUpdateFn = jest.fn();
            const text = TextFactory.create({
                size: 10,
                lineHeight: 40,
                spacing: 10,
                font: "Helvetica",
                value: "Foo bar baz",
                color: "#FFF"
            });
            const serialized   = TextFactory.serialize( text );
            const deserialized = await TextFactory.deserialize( serialized );

            expect( deserialized ).toEqual( text );
            expect( mockUpdateFn ).toHaveBeenCalledWith( "loadGoogleFont", "Helvetica" );
        });
    });

    it( "should know when two text instances are equal", () => {
        const defaultText = TextFactory.create();
        [ "size", "lineHeight", "spacing", "font", "value", "color" ].forEach( property => {
            const text = TextFactory.create({ [ property ]: 1 });
            expect( isEqual( text, defaultText )).toBe( false );
        });
        expect( isEqual( defaultText, TextFactory.create() )).toBe( true );
    });
});
