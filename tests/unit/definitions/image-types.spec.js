import { JPEG, PNG, GIF, WEBP, isCompressableFileType, isTransparent } from "@/definitions/image-types";

describe( "image types", () => {
    it( "should recognize the compressable file types", () => {
        expect( isCompressableFileType( PNG.mime )).toBe( false );
        expect( isCompressableFileType( GIF.mime )).toBe( false );
        expect( isCompressableFileType( JPEG.mime )).toBe( true );
        expect( isCompressableFileType( WEBP.mime )).toBe( true );
    });

    it( "should recognize the file types supporting transparency by their mime", () => {
        expect( isTransparent({ name: "unimportant", type: PNG.mime })).toBe( true );
        expect( isTransparent({ name: "unimportant", type: GIF.mime })).toBe( true );
        expect( isTransparent({ name: "unimportant", type: JPEG.mime })).toBe( false );
        expect( isTransparent({ name: "unimportant", type: WEBP.mime })).toBe( true );
    });

    it( "should recognize the file types supporting transparency by their extension, for Dropbox import", () => {
        const type = "dropbox"; // Dropbox imports have no MIME type associated with the file

        expect( isTransparent({ name: `file_${PNG.ext}`, type })).toBe( true );
        expect( isTransparent({ name: `file_${GIF.ext}`, type })).toBe( true );
        expect( isTransparent({ name: `file_${JPEG.ext}`, type })).toBe( false );
        expect( isTransparent({ name: `file_${WEBP.ext}`, type })).toBe( true );
    });
});
