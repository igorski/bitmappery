import DocumentFactory from "@/factories/document-factory";

let mockUpdateFn;
jest.mock( "@/factories/layer-factory", () => ({
    create: (...args) => mockUpdateFn?.( "create", ...args ),
    serialize: (...args) => mockUpdateFn?.( "serialize", ...args ),
    deserialize: (...args) => mockUpdateFn?.( "deserialize", ...args ),
}));

describe( "Document factory", () => {
    describe( "when creating a new Document", () => {
        it( "should create a default Document structure with one default layer when no arguments are passed", () => {
            mockUpdateFn = jest.fn(( fn ) => fn === "create" ? { layer: "1" } : true );
            const document = DocumentFactory.create();
            expect( document ).toEqual({
                id: expect.any( String ),
                name: "New document",
                width: 400,
                height: 300,
                layers: [ { layer: "1" } ]
            });
        });

        it( "should be able to create a Document from given arguments", () => {
            const layers = [ { layer: "1", layer: "2" } ];
            const document = DocumentFactory.create({
                name: "foo",
                width: 1200,
                height: 900,
                layers
            });
            expect( document ).toEqual({
                id: expect.any( String ),
                name: "foo",
                width: 1200,
                height: 900,
                layers
            });
        });
    });

    describe( "when serializing and deserializing a Document", () => {
        it( "should do so without data loss", async () => {
            const layers = [ { layer: "1" }, { layer: "2" } ];
            const document = DocumentFactory.create({
                name: "foo",
                width: 1200,
                height: 900,
                layers
            });
            mockUpdateFn = jest.fn(( fn, data ) => JSON.stringify( data ));
            const serialized = DocumentFactory.serialize( document );

            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "serialize", layers[ 0 ], 0, layers );
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "serialize", layers[ 1 ], 1, layers );

            mockUpdateFn = jest.fn(( fn, data ) => JSON.parse( data ));
            const deserialized = await DocumentFactory.deserialize( serialized );

            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "deserialize", expect.any( String ));
            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "deserialize", expect.any( String ));

            // note id's are unique per created session instance and therefor will differ
            expect({
                ...deserialized,
                id: expect.any( String )
            }).toEqual({
                ...document,
                id: expect.any( String )
            })
        });
    });
});
