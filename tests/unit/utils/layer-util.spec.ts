import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockCanvasElement, createState, mockZCanvas } from "../mocks";
mockZCanvas();

import { type Store } from "vuex";
import { BlendModes } from "@/definitions/blend-modes";
import { LayerTypes } from "@/definitions/layer-types";
import DocumentFactory from "@/model/factories/document-factory";
import TransformFactory from "@/model/factories/transform-factory";
import FiltersFactory from "@/model/factories/filters-factory";
import LayerFactory from "@/model/factories/layer-factory";
import { type BitMapperyState } from "@/store";
import {
    occludesObject, cropLayerContent, hasBlend, hasTransform,
    isDrawable, isMaskable, isMirrored, isOccluded, isRotated, isScaled, isTransparent,
} from "@/utils/layer-util";

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
                transform: TransformFactory.create({ rotation: 0 })
            });
            expect( isRotated( layer )).toBe( false );

            const rotatedLayer = LayerFactory.create({
                transform: TransformFactory.create({ rotation: 90 })
            });

            expect( isRotated( rotatedLayer )).toBe( true );
        });

        it( "should know when it is scaled", () => {
            const layer = LayerFactory.create({
                transform: TransformFactory.create({ scale: 1 })
            });
            expect( isScaled( layer ) ).toBe( false );

            const scaledLayer = LayerFactory.create({
                transform: TransformFactory.create({ scale: 0.9 })
            });
            expect( isScaled( scaledLayer )).toBe( true );
        });

        it( "should know when it is transparent by content", () => {
            expect(
                isTransparent( LayerFactory.create({ transparent: false }))
            ).toBe( false );

            expect(
                isTransparent( LayerFactory.create({ transparent: true }))
            ).toBe( true );
        });

        it( "should know when it is transparent by filter", () => {
            expect(
                isTransparent( LayerFactory.create({
                    transparent: false,
                    filters: {
                        enabled: true,
                        opacity: 0.5,
                    }
                }))
            ).toBe( true );
        });

        it( "should know when it is mirrored", () => {
            expect( isMirrored( LayerFactory.create() )).toBe( false );
            expect( isMirrored( LayerFactory.create({ transform: TransformFactory.create({ mirrorX: true })}))).toBe( true );
            expect( isMirrored( LayerFactory.create({ transform: TransformFactory.create({ mirrorY: true })}))).toBe( true );
        });
        
        it( "should know whether it has any kind of transformation", () => {
            expect( hasTransform( LayerFactory.create() )).toBe( false );
            expect( hasTransform( LayerFactory.create({ transform: TransformFactory.create({ rotation: 90 })}))).toBe( true );
            expect( hasTransform( LayerFactory.create({ transform: TransformFactory.create({ scale: 2 })}))).toBe( true );
            expect( hasTransform( LayerFactory.create({ transform: TransformFactory.create({ mirrorX: true })}))).toBe( true );
            expect( hasTransform( LayerFactory.create({ transform: TransformFactory.create({ mirrorY: true })}))).toBe( true );
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

    describe( "when determining whether a Layer occludes the full visible area of a reference Object", () => {
        const lowerLayer = LayerFactory.create({ left: 10, top: 10, width: 200, height: 200  });

        it( "should consider a Layer with non-transparent content at similar offset and dimensions to the compare Layer, to occlude", () => {
            const layer = LayerFactory.create({ left: 10, top: 10, width: 200, height: 200, transparent: false });

            expect( occludesObject( layer, lowerLayer )).toBe( true );
        });

        it( "should consider a non-visible Layer with non-transparent content at similar offset and dimensions to the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({ left: 10, top: 10, width: 200, height: 200, transparent: false, visible: false });

            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });

        it( "should consider a Layer with transparent content at similar offset and dimensions to the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({ left: 10, top: 10, width: 200, height: 200, transparent: true });

            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });

        it( "should consider a Layer with non-transparent content with an active blend mode at similar offset and dimensions to the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({
                left: 10, top: 10, width: 200, height: 200,
                transparent: false,
                filters: { enabled: true, blendMode: BlendModes.MULTIPLY },
            });
            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });

        it( "should consider a Layer with non-transparent content with opacity filter at similar offset and dimensions to the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({
                left: 10, top: 10, width: 200, height: 200,
                transparent: false,
                filters: { enabled: true, opacity: 0.5 }
            });
            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });

        it( "should consider a non-transparent, rotated Layer at similar offset and dimensions to the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({
                left: 10, top: 10, width: 200, height: 200,
                transparent: false,
                transform: { rotation: 45 },
            });
            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });

        it( "should consider a Layer with non-transparent content at similar offset and dimensions smaller than the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({ left: 10, top: 10, width: 190, height: 190, transparent: false });

            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });

        it( "should consider a non-transparent, scaled Layer at similar offset and original dimensions smaller than the compare Layer, to occlude", () => {
            const layer = LayerFactory.create({
                left: 10, top: 10, width: 190, height: 190,
                transparent: false,
                transform: { scale: 1.5 },
            });
            expect( occludesObject( layer, lowerLayer )).toBe( true );
        });

        it( "should consider a Layer with non-transparent content at negative x offset and similar dimensions to the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({ left: 0, top: 10, width: 200, height: 200, transparent: false });

            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });

        it( "should consider a Layer with non-transparent content at negative y offset and similar dimensions to the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({ left: 10, top: 0, width: 200, height: 200, transparent: false });

            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });

        it( "should consider a Layer with non-transparent content at negative offset and similar dimensions larger than the compare Layer, to occlude", () => {
            const layer = LayerFactory.create({ left: 0, top: 0, width: 210, height: 210, transparent: false });

            expect( occludesObject( layer, lowerLayer )).toBe( true );
        });

        it( "should consider a Layer with non-transparent content at positive x offset and similar dimensions to the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({ left: 20, top: 10, width: 200, height: 200, transparent: false });

            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });

        it( "should consider a Layer with non-transparent content at positive y offset and similar dimensions to the compare Layer, not to occlude", () => {
            const layer = LayerFactory.create({ left: 10, top: 20, width: 200, height: 200, transparent: false });

            expect( occludesObject( layer, lowerLayer )).toBe( false );
        });
    });

    describe( "when determining whether a Layer is occluded by a higher Layer", () => {
        const width = 200;
        const height = 200;

        it( "should not occlude itself", () => {
            const layer = LayerFactory.create({ transparent: false, width, height });
            const activeDocument = DocumentFactory.create({ width, height, layers: [ layer ] });

            expect( isOccluded( layer, activeDocument )).toBe( false );
        });

        it( "should not be occluded by a higher Layer with transparent content", () => {
            const layer = LayerFactory.create({ transparent: false, width, height });
            const layerAbove = LayerFactory.create({ transparent: true, width, height });

            const activeDocument = DocumentFactory.create({ width, height, layers: [ layer, layerAbove ] });

            expect( isOccluded( layer, activeDocument )).toBe( false );
        });

        it( "should not be occluded by a higher Layer with a non-similar offset", () => {
            const layer = LayerFactory.create({ transparent: false, width, height });
            const layerAbove = LayerFactory.create({ transparent: false, width, height, left: 10, top: 10 });

            const activeDocument = DocumentFactory.create({ width, height, layers: [ layer, layerAbove ] });

            expect( isOccluded( layer, activeDocument )).toBe( false );
        });

        it( "should not be occluded by a higher Layer with an active blend mode", () => {
            const layer = LayerFactory.create({ transparent: false, width, height });
            const layerAbove = LayerFactory.create({
                transparent: false, width, height, left: 0, top: 0,
                filters: { enabled: true, blendMode: BlendModes.MULTIPLY }
            });
            const activeDocument = DocumentFactory.create({ width, height, layers: [ layer, layerAbove ] });

            expect( isOccluded( layer, activeDocument )).toBe( false );
        });

        it( "should not be occluded by a higher non-visible Layer", () => {
            const layer = LayerFactory.create({ transparent: false, width, height });
            const layerAbove = LayerFactory.create({
                transparent: false, width, height, left: 0, top: 0,
                visible: false,
            });
            const activeDocument = DocumentFactory.create({ width, height, layers: [ layer, layerAbove ] });

            expect( isOccluded( layer, activeDocument )).toBe( false );
        });

        it( "should not be occluded by several higher layers that don't cover the full area", () => {
            const layer = LayerFactory.create({ transparent: false, width, height });
            const nonVisibleLayer = LayerFactory.create({
                transparent: false, width, height, left: 0, top: 0,
                visible: false,
            });
            const blendedLayer = LayerFactory.create({
                transparent: false, width, height, left: 0, top: 0,
                filters: { enabled: true, blendMode: BlendModes.MULTIPLY }
            });
            const offsetLayer = LayerFactory.create({ transparent: false, width, height, left: 10, top: 10 });
            const transparentLayer = LayerFactory.create({ transparent: true, width, height });
            const activeDocument = DocumentFactory.create({
                width, height,
                layers: [ layer, nonVisibleLayer, blendedLayer, offsetLayer, transparentLayer ]
            });
            expect( isOccluded( layer, activeDocument )).toBe( false );
        });

        it( "should be occluded by a smaller layer that has a positive scale transformation", () => {
            const layer = LayerFactory.create({ transparent: false, width, height });
            const scaledLayer = LayerFactory.create({
                transparent: false, width: 150, height: 150,
                transform: { scale: 2 },
            });
            const activeDocument = DocumentFactory.create({
                width, height,
                layers: [ layer, scaledLayer ]
            });
            expect( isOccluded( layer, activeDocument )).toBe( true );
        });

        it( "should not be occluded by a larger layer when its own scale transformation makes it larger", () => {
            const layer = LayerFactory.create({
                transparent: false, width: 150, height: 150,
                transform: { scale: 2 },
            });
            const higherLayer = LayerFactory.create({
                transparent: false, width, height,
            });
            const activeDocument = DocumentFactory.create({
                width, height,
                layers: [ layer, higherLayer ]
            });
            expect( isOccluded( layer, activeDocument )).toBe( false );
        });

        it( "should be occluded by a higher layer several positions up that covers the full area", () => {
            const layer = LayerFactory.create({ transparent: false, width, height });
            const nonVisibleLayer = LayerFactory.create({
                transparent: false, width, height, left: 0, top: 0,
                visible: false,
            });
            const blendedLayer = LayerFactory.create({
                transparent: false, width, height, left: 0, top: 0,
                filters: { enabled: true, blendMode: BlendModes.MULTIPLY }
            });
            const coveringLayer = LayerFactory.create({ transparent: false, width, height });
            const transparentLayer = LayerFactory.create({ transparent: true, width, height });
            const activeDocument = DocumentFactory.create({
                width, height,
                layers: [ layer, nonVisibleLayer, blendedLayer, coveringLayer, transparentLayer ]
            });
            expect( isOccluded( layer, activeDocument )).toBe( true );
        });
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
                transform: TransformFactory.create({ rotation: 90 }),
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
                transform: TransformFactory.create({ rotation: 90 }),
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