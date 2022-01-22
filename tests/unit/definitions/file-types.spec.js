import { isImageFile, isProjectFile, isThirdPartyDocument } from "@/definitions/file-types";
import { ALL_IMAGE_TYPES, PROJECT_FILE_EXTENSION, PSD } from "@/definitions/image-types";

jest.mock( "@/utils/environment-util", () => ({
    isSafari: () => false, // forces webp support
}));

describe( "file types", () => {
    const imageFiles = ALL_IMAGE_TYPES.map(({ mime, ext }) => ({ type: mime, name: `file.${ext}` }));
    const bpyFile    = { name: `file${PROJECT_FILE_EXTENSION}` };
    const psdFile    = { name: `file.${PSD.ext}` };

    it( "should be able to recognize the supported image files", () => {
        expect( imageFiles.filter( isImageFile )).toHaveLength( imageFiles.length );
        expect( isImageFile( bpyFile )).toBe( false );
        expect( isImageFile( psdFile )).toBe( false );
    });

    it( "should be able to recognize the BitMappery project file type", () => {
        expect( imageFiles.some( isProjectFile )).toBe( false );
        expect( isProjectFile( bpyFile )).toBe( true );
        expect( isProjectFile( psdFile )).toBe( false );
    });

    it( "should be able to recognize supported third party file types", () => {
        expect( imageFiles.some( isThirdPartyDocument )).toBe( false );
        expect( isThirdPartyDocument( bpyFile )).toBe( false );
        expect( isThirdPartyDocument( psdFile )).toBe( true );
    });
});
