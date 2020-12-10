import storeModule from '@/store/modules/image-module';

const { getters, mutations, actions } = storeModule;

let mockUpdateFn;
jest.mock('@/utils/memory-util', () => ({
    imageToSource: (...args) => mockUpdateFn?.( 'imageToSource', ...args ),
    disposeSource: (...args) => mockUpdateFn?.( 'disposeSource', ...args ),
}));

describe('Vuex image module', () => {
    describe('getters', () => {
        it('should be able to retrieve the registered images', () => {
            const state = { images: [ { foo: 'bar' }, { baz: 'qux' } ] };
            expect( getters.images( state )).toEqual( state.images );
        });
    });

    describe('mutations', () => {
        it('should be able to remove an image object from the images list', () => {
            const image1 = { file: new Blob(), source: 'blob://1', size: { width: 50, height: 50 } };
            const image2 = { file: new Blob(), source: 'blob://2', size: { width: 75, height: 75 } };
            const state = {
                images: [ image1, image2 ]
            };
            mockUpdateFn = jest.fn();
            mutations.removeImage( state, image1 );
            // assert image has been removed from list
            expect( state.images ).toEqual([ image2 ]);
            // assert allocated Blob memory has been freed
            expect( mockUpdateFn ).toHaveBeenCalledWith( 'disposeSource', image1.source );
        });
    });

    describe('actions', () => {
        it('should be able to store an image object in the images list', async () => {
            const state = { images: [] };
            const input = {
                file: new Blob(),
                image: new Image(),
                size: { width: 100, height: 100 }
            };
            mockUpdateFn = jest.fn(() => blobURL );
            const blobURL = 'blob://foo';
            const image = await actions.addImage({ state }, input );
            // assert image has been added to list
            expect( state.images ).toEqual([ { file: input.file, size: input.size, source: blobURL } ]);
            // assert image data has been allocated as Blob
            expect( mockUpdateFn ).toHaveBeenCalledWith( 'imageToSource', input.image );
            // assert return data contains allocated Blob resource
            expect( image ).toEqual( state.images[ 0 ]);
        });
    });
});
