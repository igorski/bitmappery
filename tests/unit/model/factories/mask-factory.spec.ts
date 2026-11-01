import { it, describe, expect, vi } from "vitest";
import MaskFactory from "@/model/factories/mask-factory";
import { createMockCanvasElement } from "../../mocks";

let mockUpdateFn: ( fnName: string, ...args: any[] ) => void;
vi.mock( "@/utils/canvas-util", () => ({
    createCanvas: () => ({
        cvs: {},
    }),
    imageToBase64: (...args: any[]) => mockUpdateFn?.( "imageToBase64", ...args ),
    base64toCanvas: (...args: any[]) => mockUpdateFn?.( "base64toCanvas", ...args ),
}));

describe( "Mask factory", () => {
    describe( "when creating a new Mask", () => {
        it( "should create a default Mask structure when no arguments are passed", () => {
            const mask = MaskFactory.create();

            expect( mask ).toEqual({
                id: expect.any( String ),
                source: null,
                enabled: true,
                left: 0,
                top: 0,
            });
        });

        it( "should be able to create a Mask from provided arguments", () => {
            const source = createMockCanvasElement();
            const mask = MaskFactory.create({ source, enabled: false, left: 30, top: 20 });

            expect( mask ).toEqual({
                id: expect.any( String ),
                source,
                enabled: false,
                left: 30,
                top: 20,
            });
        });
    });

    describe( "when serializing and deserializing a Mask", () => {
        it( "should do so without data loss", async () => {
            const source = createMockCanvasElement( 200, 100 );
            
            const mask = MaskFactory.create({ source, enabled: false, left: 30, top: 20 });

            mockUpdateFn = vi.fn(( _fn, data ) => data );

            const serialized = MaskFactory.serialize( mask );

            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "imageToBase64", mask.source, 200, 100, true );

            mockUpdateFn = vi.fn(( _fn, data ) => data );

            const deserialized = await MaskFactory.deserialize( serialized );

            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "base64toCanvas", expect.any( Object ), 200, 100 );
            
            // note id's are unique per created Mask instance and therefor are expected to differ
            expect({
                ...deserialized,
                id: expect.any( String ),
            }).toEqual({
                ...mask,
                id: expect.any( String ),
            });
        });
    });
});