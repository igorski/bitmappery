import storeModule from "@/store/modules/image-module";

const { getters, mutations, actions } = storeModule;

let mockUpdateFn;
jest.mock("@/utils/resource-manager", () => ({
    imageToResource: (...args) => mockUpdateFn?.( "imageToResource", ...args ),
    disposeResource: (...args) => mockUpdateFn?.( "disposeResource", ...args ),
    isResource: (...args) => mockUpdateFn?.( "isResource", ...args ),
}));

describe( "Vuex image module", () => {
    describe("getters", () => {
        it("should be able to retrieve the registered images", () => {
            const state = { images: [ { foo: "bar" }, { baz: "qux" } ] };
            expect( getters.images( state )).toEqual( state.images );
        });
    });

    describe( "mutations", () => {
        it("should be able to remove an image object from the images list", () => {
            const image1 = { file: new Blob(), source: "blob://1", size: { width: 50, height: 50 } };
            const image2 = { file: new Blob(), source: "blob://2", size: { width: 75, height: 75 } };
            const state = {
                images: [ image1, image2 ]
            };
            mockUpdateFn = jest.fn();
            mutations.removeImage( state, image1 );
            // assert image has been removed from list
            expect( state.images ).toEqual([ image2 ]);
            // assert allocated Blob memory has been freed
            expect( mockUpdateFn ).toHaveBeenCalledWith( "disposeResource", image1.source );
        });
    });

    describe( "actions", () => {
        describe( "adding an image object to the images list", () => {
            it("should directly add images with a Blob source", async () => {
                const state = { images: [] };
                const input = {
                    file: { type: "image/png" },
                    image: { src: "blob:http://foo" },
                    size: { width: 100, height: 100 },
                };
                mockUpdateFn = jest.fn(fn => fn === "isResource" ? true : false );
                const image = await actions.addImage({ state }, input );
                // assert image has been added to list
                expect( state.images ).toEqual([ { file: input.file, size: input.size, source: input.image.src } ]);
                // assert image data has been allocated as Blob
                expect( mockUpdateFn ).not.toHaveBeenCalledWith( "imageToResource" );
                // assert return data contains allocated Blob resource
                expect( image ).toEqual( state.images[ 0 ]);
            });

            it("should directly add images with a remote source", async () => {
                const state = { images: [] };
                const input = {
                    file: { type: "image/png" },
                    image: { src: "http://localhost/foo.png" },
                    size: { width: 100, height: 100 },
                };
                const image = await actions.addImage({ state }, input );
                // assert image has been added to list
                expect( state.images ).toEqual([ { file: input.file, size: input.size, source: input.image.src } ]);
                // assert image data has been allocated as Blob
                expect( mockUpdateFn ).not.toHaveBeenCalledWith( "imageToResource" );
                // assert return data contains allocated Blob resource
                expect( image ).toEqual( state.images[ 0 ]);
            });

            it("should convert images with any other source to Blob", async () => {
                const state = { images: [] };
                const input = {
                    file: { type: "image/png" },
                    image: { src: "base64" },
                    size: { width: 100, height: 100 },
                };
                mockUpdateFn = jest.fn( fn => fn === "isResource" ? false : "" );
                const image = await actions.addImage({ state }, input );
                // assert image has been added to list
                expect( state.images ).toEqual([ { file: input.file, size: input.size, source: expect.any( String ) } ]);
                // assert image data has been allocated as Blob
                expect( mockUpdateFn ).toHaveBeenCalledWith( "imageToResource", input.image, input.file.type );
                // assert return data contains allocated Blob resource
                expect( image ).toEqual( state.images[ 0 ]);
            });
        });
    });
});
