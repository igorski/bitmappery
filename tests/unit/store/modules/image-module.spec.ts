import { it, describe, expect, vi } from "vitest";
import storeModule, { createImageState, type WrappedImage } from "@/store/modules/image-module";

const { getters, mutations, actions } = storeModule;

let mockUpdateFn: ( fnName: string, ...args: any[] ) => void;
vi.mock("@/utils/resource-manager", () => ({
    imageToResource: (...args: any[]) => mockUpdateFn?.( "imageToResource", ...args ),
    disposeResource: (...args: any[]) => mockUpdateFn?.( "disposeResource", ...args ),
    isResource: (...args: any[]) => mockUpdateFn?.( "isResource", ...args ),
}));

describe( "Vuex image module", () => {
    function createMockImage( props: Partial<WrappedImage>): WrappedImage {
        return {
            source: "foo",
            file: new Blob(),
            size: 500000,
            usages: [ "foo" ],
            ...props,
        };
    }

    describe( "getters", () => {
        it( "should be able to retrieve the registered images", () => {
            const state = createImageState({
                images: [
                    createMockImage({ source: "bar" }),
                    createMockImage({ source: "qux" })
                ]
            });
            expect( getters.images( state, getters, {}, {} )).toEqual( state.images );
        });

        it( "should be able to retrieve the file target", () => {
            const state = createImageState({ fileTarget: "layer" });
            expect( getters.fileTarget( state, getters, {}, {} )).toEqual( state.fileTarget );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the file target", () => {
            const state = createImageState({ fileTarget: "document" });
            mutations.setFileTarget( state, "layer" );
            expect( state.fileTarget ).toEqual( "layer" );
        });

        it( "should be able to track an images usage across documents", () => {
            const state = createImageState({
                images: [
                    createMockImage({ source: "image1", usages: [ "foo", "bar" ] }),
                    createMockImage({ source: "image2", usages: [ "baz", "qux" ] }),
                ]
            });
            mutations.setImageSourceUsage( state, { source: state.images[1].source, document: { id: "quux" } });
            expect( state.images ).toEqual([
                createMockImage({ source: "image1", usages: [ "foo", "bar" ] }),
                createMockImage({ source: "image2", usages: [ "baz", "qux", "quux" ] }),
            ]);
        });

        it( "should be able to remove an image object from the images list", () => {
            const image1 = createMockImage({ source: "blob://1", size: 500000 });
            const image2 = createMockImage({ source: "blob://2", size: 250000 });
            const state = createImageState({
                images: [ image1, image2 ]
            });
            mockUpdateFn = vi.fn();
            mutations.removeImage( state, image1 );
            // assert image has been removed from list
            expect( state.images ).toEqual([ image2 ]);
            // assert allocated Blob memory has been freed
            expect( mockUpdateFn ).toHaveBeenCalledWith( "disposeResource", image1.source );
        });

        describe( "when removing all images for a document", () => {
            it( "should remove the image from the list and dispose its source when no usages remain", () => {
                const state = createImageState({
                    images: [
                        createMockImage({ source: "image1src", size: 1000000, usages: [ "foo", "bar" ] }),
                        createMockImage({ source: "image2src", size: 500000,  usages: [ "foo" ] })
                    ]
                });
                const [ image1, image2 ] = state.images;

                mockUpdateFn = vi.fn();
                mutations.removeImagesForDocument( state, { id: "foo" });

                // assert image2 has been removed from the list as no usages remained
                expect( state.images ).toEqual([ image1 ]);

                // assert image2's source has been disposed
                expect( mockUpdateFn ).toHaveBeenCalledWith( "disposeResource", image2.source );

                // assert image1's source has remained
                expect( mockUpdateFn ).not.toHaveBeenCalledWith( "disposeResource", image1.source );

                // now also remove for the second document
                mutations.removeImagesForDocument( state, { id: "bar" });

                // assert no images remain in the list
                expect( state.images ).toHaveLength( 0 );
                
                // and image1's source has been disposed
                expect( mockUpdateFn ).toHaveBeenCalledWith( "disposeResource", image1.source );
            });
        });
    });

    describe( "actions", () => {
        describe( "adding an image object to the images list", () => {
            it("should directly add images with a Blob source", async () => {
                const state = createImageState({ images: [] });
                const input = {
                    file: { type: "image/png" },
                    image: { src: "blob:http://foo" },
                    size: 125000,
                };
                mockUpdateFn = vi.fn(fn => fn === "isResource" ? true : false );

                // @ts-expect-error Not all constituents of type 'Action<ImageState, any>' are callable
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
                const state = createImageState({ images: [] });
                const input = {
                    file: { type: "image/png" },
                    image: { src: "http://localhost/foo.png" },
                    size: { width: 100, height: 100 },
                };

                // @ts-expect-error Not all constituents of type 'Action<ImageState, any>' are callable
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
        });
    });
});
