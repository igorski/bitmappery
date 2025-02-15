import { it, describe, expect, vi } from "vitest";
import {
    PROJECT_FILE_EXTENSION, PREVIEW_THUMBNAIL, PSD, PDF,
    isImageFile, isProjectFile, isThirdPartyDocument, getMimeForThirdPartyDocument, getMimeByFileName,
} from "@/definitions/file-types";
import { ALL_IMAGE_TYPES, JPEG, PNG, GIF, WEBP } from "@/definitions/image-types";
import { createMockFile } from "../mocks";

vi.mock( "@/utils/environment-util", () => ({
    isSafari: () => false, // forces webp support
}));

describe( "file types", () => {
    const imageFiles = ALL_IMAGE_TYPES.map(({ mime, ext }) => ({ type: mime, name: `file.${ext}` }));
    const bpyFile    = createMockFile( `file.${PROJECT_FILE_EXTENSION}` );
    const psdFile    = createMockFile( `file.${PSD.ext}` );
    const pdfFile    = createMockFile( `file.${PDF.ext}` );

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

    describe( "when retrieving the MIME from the file name", () => {
        it( "should recognise all JPEG extensions", () => {
            expect( getMimeByFileName( "image.jpg" )).toEqual( JPEG.mime );
            expect( getMimeByFileName( "image.jpeg" )).toEqual( JPEG.mime );
        });

        it( "should recognise a GIF file", () => {
            expect( getMimeByFileName( "image.gif" )).toEqual( GIF.mime );
        });

        it( "should recognise a PNG file", () => {
            expect( getMimeByFileName( "image.png" )).toEqual( PNG.mime );
        });

        it( "should recognise a WEBP file", () => {
            expect( getMimeByFileName( "image.webp" )).toEqual( WEBP.mime );
        });

        it( "should recognise a PSD file", () => {
            expect( getMimeByFileName( "image.psd" )).toEqual( PSD.mime );
        });

        it( "should recognise a PDF file", () => {
            expect( getMimeByFileName( "image.pdf" )).toEqual( PDF.mime );
        });

        it( "should recognise a BitMappery document", () => {
            expect( getMimeByFileName( `image.${PROJECT_FILE_EXTENSION}` )).toEqual( PROJECT_FILE_EXTENSION );
        });

        it( "should recognise a BitMappery preview thumbnail", () => {
            expect( getMimeByFileName( `file.${PREVIEW_THUMBNAIL}` )).toEqual( PREVIEW_THUMBNAIL );
        })
    })
});
