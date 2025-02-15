import { it, describe, expect } from "vitest";
import { JPEG, PNG, GIF, WEBP, isCompressableFileType, isTransparent } from "@/definitions/image-types";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import { createMockFile } from "../mocks";

describe( "image types", () => {
    it( "should recognize the compressable file types", () => {
        expect( isCompressableFileType( PNG.mime )).toBe( false );
        expect( isCompressableFileType( GIF.mime )).toBe( false );
        expect( isCompressableFileType( JPEG.mime )).toBe( true );
        expect( isCompressableFileType( WEBP.mime )).toBe( true );
    });

    it( "should recognize the file types supporting transparency by their mime", () => {
        expect( isTransparent( createMockFile( "unimportant", PNG.mime ))).toBe( true );
        expect( isTransparent( createMockFile( "unimportant", GIF.mime ))).toBe( true );
        expect( isTransparent( createMockFile( "unimportant", JPEG.mime ))).toBe( false );
        expect( isTransparent( createMockFile( "unimportant", WEBP.mime ))).toBe( true );
    });

    it( "should recognize the file types supporting transparency by their extension, for Dropbox import", () => {
        const type = STORAGE_TYPES.DROPBOX; // Dropbox imports have no MIME type associated with the file

        expect( isTransparent( createMockFile( `file_${PNG.ext}`,  type ))).toBe( true );
        expect( isTransparent( createMockFile( `file_${GIF.ext}`,  type ))).toBe( true );
        expect( isTransparent( createMockFile( `file_${JPEG.ext}`, type ))).toBe( false );
        expect( isTransparent( createMockFile( `file_${WEBP.ext}`, type ))).toBe( true );
    });
});
