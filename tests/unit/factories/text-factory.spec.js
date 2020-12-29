import TextFactory from "@/factories/text-factory";

describe( "Text factory", () => {
    describe( "when creating a new Text instance", () => {
        it( "should create a default Text structure when no arguments are passed", () => {
            const text = TextFactory.create();
            expect( text ).toEqual({
                size: expect.any( Number ),
                value: "",
                font: "Arial",
                color: "red",
            });
        });

        it( "should be able to create a Text structure from given arguments", () => {
            const text = TextFactory.create({
                size: 10,
                font: "Helvetica",
                value: "Foo bar baz",
                color: "#FF00AE"
            });
            expect( text ).toEqual({
                size: 10,
                font: "Helvetica",
                value: "Foo bar baz",
                color: "#FF00AE"
            });
        });
    });

    describe( "when serializing and deserializing a Text structure", () => {
        it( "should do so without data loss", async () => {
            const text = TextFactory.create({
                size: 10,
                font: "Helvetica",
                value: "Foo bar baz",
                color: "#FFF"
            });
            const serialized = TextFactory.serialize( text );
            const deserialized = TextFactory.deserialize( serialized );

            expect( deserialized ).toEqual( text );
        });
    });
});
