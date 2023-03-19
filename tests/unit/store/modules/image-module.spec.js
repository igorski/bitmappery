import { it, describe, expect, vi } from "vitest";
import storeModule from "@/store/modules/image-module";

const { getters, mutations, actions } = storeModule;

let mockUpdateFn;
vi.mock("@/utils/resource-manager", () => ({
    imageToResource: (...args) => mockUpdateFn?.( "imageToResource", ...args ),
    disposeResource: (...args) => mockUpdateFn?.( "disposeResource", ...args ),
    isResource: (...args) => mockUpdateFn?.( "isResource", ...args ),
}));

describe( "Vuex image module", () => {
    describe( "getters", () => {
        it( "should be able to retrieve the registered images", () => {
            const state = { images: [ { foo: "bar" }, { baz: "qux" } ] };
            expect( getters.images( state )).toEqual( state.images );
        });

        it( "should be able to retrieve the file target", () => {
            const state = { fileTarget: "layer" };
            expect( getters.fileTarget( state )).toEqual( state.fileTarget );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the file target", () => {
            const state = { fileTarget: "document" };
            mutations.setFileTarget( state, "layer" );
            expect( state.fileTarget ).toEqual( "layer" );
        });

        it( "should be able to track an images usage across documents", () => {
            const state = {
                images: [
                    { source: "image1", usages: [ "foo", "bar" ] },
                    { source: "image2", usages: [ "baz", "qux" ] }
                ]
            };
            mutations.setImageSourceUsage( state, { source: state.images[1].source, document: { id: "quux" } });
            expect( state.images ).toEqual([
                { source: "image1", usages: [ "foo", "bar" ] },
                { source: "image2", usages: [ "baz", "qux", "quux" ] }
            ]);
        });

        it( "should be able to remove an image object from the images list", () => {
            const image1 = { file: new Blob(), source: "blob://1", size: { width: 50, height: 50 } };
            const image2 = { file: new Blob(), source: "blob://2", size: { width: 75, height: 75 } };
            const state = {
                images: [ image1, image2 ]
            };
            mockUpdateFn = vi.fn();
            mutations.removeImage( state, image1 );
            // assert image has been removed from list
            expect( state.images ).toEqual([ image2 ]);
            // assert allocated Blob memory has been freed
            expect( mockUpdateFn ).toHaveBeenCalledWith( "disposeResource", image1.source );
        });

        describe( "when removing all images for a document", () => {
            it( "should remove the image from the list and dispose its source when no usages remain", () => {
                const state = {
                    images: [
                        { source: "image1src", usages: [ "foo", "bar" ] },
                        { source: "image2src", usages: [ "foo" ] }
                    ]
                };
                mockUpdateFn = vi.fn();
                mutations.removeImagesForDocument( state, { id: "foo" });

                // assert image2 has been removed from the list as no usages remained
                expect( state.images ).toEqual([
                    { source: "image1src", usages: [ "bar" ] }
                ]);
                // assert image2's source has been disposed
                expect( mockUpdateFn ).toHaveBeenCalledWith( "disposeResource", "image2src" );

                // assert image1's source has remained
                expect( mockUpdateFn ).not.toHaveBeenCalledWith( "disposeResource", "image1src" );

                // now also remove for the second document
                mutations.removeImagesForDocument( state, { id: "bar" });

                // assert no images remain in the list
                expect( state.images ).toEqual([]);
                // and image1's source has been disposed
                expect( mockUpdateFn ).toHaveBeenCalledWith( "disposeResource", "image1src" );
            });
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
                mockUpdateFn = vi.fn(fn => fn === "isResource" ? true : false );
                const image = await actions.addImage({ state }, input );
                // assert image has been added to list
                expect( state.images ).toEqual([ {
                    file: input.file,
                    size: input.size,
                    source: input.image.src,
                    usages: []
                } ]);
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
                expect( state.images ).toEqual([{
                    file: input.file,
                    size: input.size,
                    source: input.image.src,
                    usages: []
                }]);
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
                mockUpdateFn = vi.fn( fn => fn === "isResource" ? false : "" );
                const image = await actions.addImage({ state }, input );
                // assert image has been added to list
                expect( state.images ).toEqual([{
                    file: input.file,
                    size: input.size,
                    source: expect.any( String ),
                    usages: []
                }]);
                // assert image data has been allocated as Blob
                expect( mockUpdateFn ).toHaveBeenCalledWith( "imageToResource", input.image, input.file.type );
                // assert return data contains allocated Blob resource
                expect( image ).toEqual( state.images[ 0 ]);
            });
        });
    });
});
