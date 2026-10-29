import { it, describe, expect, vi } from "vitest";
import MaskFactory from "@/model/factories/layer-factory";
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
                source: null,
                enabled: true,
                x: 0,
                y: 0,
            });
        });

        it( "should be able to create a Mask from provided arguments", () => {
            const source = createMockCanvasElement();
            const mask = MaskFactory.create({ source, enabled: false, x: 30, y: 20 });

            expect( mask ).toEqual({
                source,
                enabled: false,
                x: 30,
                y: 20,
            });
        });
    });

    describe( "when serializing and deserializing a Mask", () => {
        it( "should do so without data loss", async () => {
            const source = createMockCanvasElement();
            const mask = MaskFactory.create({ source, enabled: false, x: 30, y: 20 });

            mockUpdateFn = vi.fn(( _fn, data ) => data );

            const serialized = MaskFactory.serialize( mask, 200, 100 );

            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 1, "imageToBase64", mask.source, 200, 100, true );

            mockUpdateFn = vi.fn(( _fn, data ) => data );

            const deserialized = await MaskFactory.deserialize( serialized );

            expect( mockUpdateFn ).toHaveBeenNthCalledWith( 2, "base64toCanvas", expect.any( Object ), 200, 100 );
            
            // note id's are unique per created session instance and therefor will differ
            expect({
                ...deserialized,
            }).toEqual({
                ...mask,
            });
        });
    });
});