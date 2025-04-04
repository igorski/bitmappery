import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockCanvasElement, createState, mockZCanvas } from "../mocks";
mockZCanvas();

import { type Store } from "vuex";
import { BlendModes } from "@/definitions/blend-modes";
import { LayerTypes } from "@/definitions/layer-types";
import TransformationsFactory from "@/factories/transformations-factory";
import FiltersFactory from "@/factories/filters-factory";
import LayerFactory from "@/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import { cropLayerContent, hasBlend, hasTransform, isDrawable, isMaskable, isMirrored, isRotated, isScaled } from "@/utils/layer-util";

const mockResizeImage = vi.fn();
vi.mock( "@/utils/canvas-util", async ( importOriginal ) => {
    return {
        ...await importOriginal(),
        resizeImage: ( ...args: any[] ) => {
            mockResizeImage( ...args );
            return Promise.resolve( createMockCanvasElement() );
        },
    }
});

describe( "Layer utilities", () => {
    let mockStore: Store<BitMapperyState>;

    beforeEach(() => {
        mockStore = createState() as unknown as Store<BitMapperyState>;
        // @ts-expect-error getters is readonly
        mockStore.getters = {
            activeLayerMask: null,
        };
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe( "when determining the Layers transformations", () => {
        it( "should know when it is rotated", () => {
            const layer = LayerFactory.create({
                transformations: TransformationsFactory.create({ rotation: 0 })
            });
            expect( isRotated( layer )).toBe( false );

            const rotatedLayer = LayerFactory.create({
                transformations: TransformationsFactory.create({ rotation: 90 })
            });

            expect( isRotated( rotatedLayer )).toBe( true );
        });

        it( "should know when it is scaled", () => {
            const layer = LayerFactory.create({
                transformations: TransformationsFactory.create({ scale: 1 })
            });
            expect( isScaled( layer ) ).toBe( false );

            const scaledLayer = LayerFactory.create({
                transformations: TransformationsFactory.create({ scale: 0.9 })
            });
            expect( isScaled( scaledLayer )).toBe( true );
        });

        it( "should know when it is mirrored", () => {
            expect( isMirrored( LayerFactory.create() )).toBe( false );
            expect( isMirrored( LayerFactory.create({ transformations: TransformationsFactory.create({ mirrorX: true })}))).toBe( true );
            expect( isMirrored( LayerFactory.create({ transformations: TransformationsFactory.create({ mirrorY: true })}))).toBe( true );
        });
        
        it( "should know whether it has any kind of transformation", () => {
            expect( hasTransform( LayerFactory.create() )).toBe( false );
            expect( hasTransform( LayerFactory.create({ transformations: TransformationsFactory.create({ rotation: 90 })}))).toBe( true );
            expect( hasTransform( LayerFactory.create({ transformations: TransformationsFactory.create({ scale: 2 })}))).toBe( true );
            expect( hasTransform( LayerFactory.create({ transformations: TransformationsFactory.create({ mirrorX: true })}))).toBe( true );
            expect( hasTransform( LayerFactory.create({ transformations: TransformationsFactory.create({ mirrorY: true })}))).toBe( true );
        });
    });

    describe( "When determining the Layers blend state", () => {
        it( "should not consider a Layer that has a NORMAL blend configured as having a blend", () => {
            const filters = FiltersFactory.create({ enabled: true, blendMode: BlendModes.NORMAL });
            const layer = LayerFactory.create({ filters });
    
            expect( hasBlend( layer )).toBe( false );
        });
    
        it( "should not consider a Layer that has a positive blend filter configured, but its filters disabled, as having a blend", () => {
            const filters = FiltersFactory.create({ enabled: false, blendMode: BlendModes.DARKEN });
            const layer = LayerFactory.create({ filters });
    
            expect( hasBlend( layer )).toBe( false );
        });
    
        it( "should consider a Layer that has a positive blend filter configured, and its filters enabled, as having a blend", () => {
            const filters = FiltersFactory.create({ enabled: true, blendMode: BlendModes.DARKEN });
            const layer = LayerFactory.create({ filters });
    
            expect( hasBlend( layer )).toBe( true );
        });
    });

    it( "should consider a Layer drawable when its of the GRAPHIC type or has a mask", () => {
        const graphicLayer = LayerFactory.create({ type: LayerTypes.LAYER_GRAPHIC } );
        const imageLayer   = LayerFactory.create({ type: LayerTypes.LAYER_IMAGE, mask: createMockCanvasElement() } );
        const textLayer    = LayerFactory.create({ type: LayerTypes.LAYER_TEXT,  mask: createMockCanvasElement() } );

        expect( isDrawable( graphicLayer, mockStore )).toBe( true );
        expect( isDrawable( imageLayer,   mockStore )).toBe( false );
        expect( isDrawable( textLayer,    mockStore )).toBe( false );
        
        mockStore.getters.activeLayerMask = imageLayer.mask;

        expect( isDrawable( imageLayer, mockStore )).toBe( true );

        mockStore.getters.activeLayerMask = textLayer.mask;
        
        expect( isDrawable( textLayer, mockStore )).toBe( true );
    });

    it( "should consider a Layer maskable when it has a mask which is currently marked as active in the store", () => {
        const layer = LayerFactory.create();

        expect( isMaskable( layer, mockStore )).toBe( false );
        
        layer.mask = createMockCanvasElement();

        expect( isMaskable( layer, mockStore )).toBe( false );

        mockStore.getters.activeLayerMask = layer.mask;

        expect( isMaskable( layer, mockStore )).toBe( true );
    });

    describe( "when cropping a Layer", () => {
        it( "should resize the source contents", async () => {
            const source = createMockCanvasElement();

            const layer = LayerFactory.create({
                left: 0,
                top: 0,
                width: 80,
                height: 100,
                source,
            });
            await cropLayerContent( layer, { left: 10, top: 20, width: 40, height: 50 });

            expect( mockResizeImage ).toHaveBeenCalledWith( source, 40, 50, 10, 20, 40, 50 );
        });

        it( "should not resize the source contents but offset the Layer when the Layer is of the TEXT type", () => {
            const layer = LayerFactory.create({
                type: LayerTypes.LAYER_TEXT,
                left: 0,
                top: 0,
                width: 80,
                height: 100,
                source: createMockCanvasElement(),
            });
            cropLayerContent( layer, { left: 10, top: 20, width: 40, height: 50 });

            expect( mockResizeImage ).not.toHaveBeenCalled();
            expect( layer.left ).toEqual( -10 );
            expect( layer.top ).toEqual( -20 );
        });

        it( "should not resize the source contents but offset the Layer when the Layer has transformations", () => {
            const layer = LayerFactory.create({
                left: 0,
                top: 0,
                width: 80,
                height: 100,
                source: createMockCanvasElement(),
                transformations: TransformationsFactory.create({ rotation: 90 }),
            });
            cropLayerContent( layer, { left: 10, top: 20, width: 40, height: 50 });

            expect( mockResizeImage ).not.toHaveBeenCalled();
            expect( layer.left ).toEqual( -10 );
            expect( layer.top ).toEqual( -20 );
        });

        it( "should not resize the source contents but offset the Layer when the Layer is offset", () => {
            const layer = LayerFactory.create({
                left: -10,
                top: -5,
                width: 80,
                height: 100,
                source: createMockCanvasElement(),
                transformations: TransformationsFactory.create({ rotation: 90 }),
            });
            cropLayerContent( layer, { left: 10, top: 20, width: 40, height: 50 });

            expect( mockResizeImage ).not.toHaveBeenCalled();
            expect( layer.left ).toEqual( -20 );
            expect( layer.top ).toEqual( -25 );
        });

        it( "should update the Layer dimensions when the Layer size is larger than the crop size", async () => {
            const layer = LayerFactory.create({
                left: 0,
                top: 0,
                width: 80,
                height: 100,
                source: createMockCanvasElement(),
            });
            await cropLayerContent( layer, { left: 10, top: 20, width: 40, height: 50 });

            expect( layer.width ).toEqual( 40 );
            expect( layer.height ).toEqual( 50 );
        });

        it( "should not resize the source contents but offset the Layer when the Layer size is smaller than the crop size", () => {
            const layer = LayerFactory.create({
                left: 0,
                top: 0,
                width: 30,
                height: 40,
                source: createMockCanvasElement(),
            });
            cropLayerContent( layer, { left: 10, top: 20, width: 40, height: 50 });

            expect( mockResizeImage ).not.toHaveBeenCalled();
            expect( layer.left ).toEqual( -10 );
            expect( layer.top ).toEqual( -20 );
        });

        it( "should not update the Layer dimensions when the Layer size is smaller than the crop size", () => {
            const layer = LayerFactory.create({
                left: 0,
                top: 0,
                width: 30,
                height: 40,
                source: createMockCanvasElement(),
            });
            cropLayerContent( layer, { left: 10, top: 20, width: 40, height: 50 });

            expect( layer.width ).toEqual( 30 );
            expect( layer.height ).toEqual( 40 );
        });
    });
});