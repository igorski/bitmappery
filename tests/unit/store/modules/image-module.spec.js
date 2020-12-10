import storeModule from '@/store/modules/image-module';

const { mutations } = storeModule;

describe('Vuex image module', () => {
    describe('mutations', () => {
        it('should be able to store an image object in the images list', () => {
            const state = { images: [] };
            const image = {
                file: new Blob(),
                size: { width: 100, height: 100 }
            };
            mutations.addImage( state, image );
            expect( state.images ).toEqual([ image ]);
        });

        it('should be able to remove an image object from the images list', () => {
            const image1 = { file: new Blob(), size: { width: 50, height: 50 } };
            const image2 = { file: new Blob(), size: { width: 75, height: 75 } };
            const state = {
                images: [ image1, image2 ]
            };
            mutations.removeImage( state, image1 );
            expect( state.images ).toEqual([ image2 ]);
        });
    });
});
