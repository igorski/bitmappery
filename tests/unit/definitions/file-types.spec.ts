import { it, describe, expect, vi } from "vitest";
import {
    PROJECT_FILE_EXTENSION, PSD, PDF,
    isImageFile, isProjectFile, isThirdPartyDocument, getMimeForThirdPartyDocument
} from "@/definitions/file-types";
import { ALL_IMAGE_TYPES } from "@/definitions/image-types";

vi.mock( "@/utils/environment-util", () => ({
    isSafari: () => false, // forces webp support
}));

describe( "file types", () => {
    const imageFiles = ALL_IMAGE_TYPES.map(({ mime, ext }) => ({ type: mime, name: `file.${ext}` }));
    const bpyFile    = { name: `file.${PROJECT_FILE_EXTENSION}` };
    const psdFile    = { name: `file.${PSD.ext}` };
    const pdfFile    = { name: `file.${PDF.ext}` };

    it( "should be able to recognize the supported image files", () => {
        expect( imageFiles.filter( isImageFile )).toHaveLength( imageFiles.length );
        expect( isImageFile( bpyFile )).toBe( false );
        expect( isImageFile( psdFile )).toBe( false );
        expect( isImageFile( pdfFile )).toBe( false );
    });

    it( "should be able to recognize the BitMappery project file type", () => {
        expect( imageFiles.some( isProjectFile )).toBe( false );
        expect( isProjectFile( bpyFile )).toBe( true );
        expect( isProjectFile( psdFile )).toBe( false );
        expect( isProjectFile( pdfFile )).toBe( false );
    });

    it( "should be able to recognize supported third party file types", () => {
        expect( imageFiles.some( isThirdPartyDocument )).toBe( false );
        expect( isThirdPartyDocument( bpyFile )).toBe( false );
        expect( isThirdPartyDocument( psdFile )).toBe( true );
        expect( isThirdPartyDocument( pdfFile )).toBe( true );
    });

    it( "should be able to retrieve to appropriate MIME type for a third party file type", () => {
        expect( getMimeForThirdPartyDocument( bpyFile )).toBeUndefined();
        expect( getMimeForThirdPartyDocument( psdFile )).toEqual( PSD.mime );
        expect( getMimeForThirdPartyDocument( pdfFile )).toEqual( PDF.mime );
    });
});
