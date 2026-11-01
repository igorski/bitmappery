/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2026 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import type { Rectangle } from "zcanvas";
import { LayerTypes, DEFAULT_LAYER_NAME, DEFAULT_TEXT_LAYER_NAME } from "@/definitions/layer-types";
import FiltersFactory, { type FiltersProps } from "@/model/factories/filters-factory";
import MaskFactory, { type MaskProps } from "@/model/factories/mask-factory";
import TextFactory, { type TextProps } from "@/model/factories/text-factory";
import TransformFactory, { type TransformProps } from "@/model/factories/transform-factory";
import type { Layer, LayerRel } from "@/model/types/layer";
import { type Mask } from "@/model/types/mask";
import { imageToBase64, base64toCanvas } from "@/utils/canvas-util";

export const FACTORY_VERSION = 2;

let UID_COUNTER = 0;

export type LayerProps = Partial<Omit<Layer, "id" | "mask" | "transform" | "filters" | "text" | "rel">> & {
    transform?: TransformProps;
    filters?: FiltersProps;
    mask?: MaskProps;
    text?: TextProps;
    rel?: Partial<LayerRel>;
};

const LayerFactory = {
    /**
     * Creates a new layer for use within a Document
     */
    create({
        name = DEFAULT_LAYER_NAME,
        type = LayerTypes.LAYER_GRAPHIC, transparent = true, source = null, mask = null,
        left = 0, top = 0, width = 1, height = 1, visible = true,
        transform = {}, filters = {}, text = {}, rel = {},
    }: LayerProps = {}): Layer {
        return {
            id: `layer_${( ++UID_COUNTER )}`,
            name: ( name === DEFAULT_LAYER_NAME && type === LayerTypes.LAYER_TEXT ) ? DEFAULT_TEXT_LAYER_NAME : name,
            type,
            source,
            transparent,
            left,
            top,
            width,
            height,
            visible,
            mask: mask ? MaskFactory.create( mask ) : null,
            text: TextFactory.create( text ),
            transform: TransformFactory.create( transform ),
            filters: FiltersFactory.create( filters ),
            rel: {
                type: "none",
                ...rel,
            },
        }
    },

    /**
     * Saving layer properties into a simplified JSON structure
     * for project storage
     */
    serialize( layer: Layer ): any {
        return {
            n: layer.name,
            t: layer.type,
            tr: layer.transparent,
            s: imageToBase64( layer.source, layer.width, layer.height, layer.transparent ),
            x: layer.left,
            y: layer.top,
            w: layer.width,
            h: layer.height,
            m: layer.mask ? MaskFactory.serialize( layer.mask ) : undefined,
            tx: TextFactory.serialize( layer.text ),
            f: TransformFactory.serialize( layer.transform ),
            fl: FiltersFactory.serialize( layer.filters ),
            v: layer.visible,
            r: {
                t: layer.rel.type,
                i: layer.rel.id,
            },
            fv: FACTORY_VERSION,
        };
    },

    /**
     * Creating a new layer instance from a stored layer structure
     * inside a stored project
     */
    async deserialize( layer: any ): Promise<Layer> {
        const serializedVersion = layer.fv ?? 1;

        let mask;
        if ( layer.m ) {
            mask = ( serializedVersion === 1 ) ? await migrateLegacyMask( layer ) : await MaskFactory.deserialize( layer.m );
        }
        const source = await base64toCanvas( layer.s, layer.w, layer.h );
        const text   = await TextFactory.deserialize( layer.tx );

        return LayerFactory.create({
            name: layer.n,
            type: layer.t,
            transparent: layer.tr,
            source,
            mask,
            left: layer.x,
            top: layer.y,
            width: layer.w,
            height: layer.h,
            visible: layer.v,
            text,
            transform: TransformFactory.deserialize( layer.f ),
            filters: FiltersFactory.deserialize( layer.fl ),
            rel: layer.r ? {
                type: layer.r.t,
                id: layer.r.i,
            } : {}
        });
    }
};
export default LayerFactory;

export const layerToRect = ( layer: Layer ): Rectangle => ({
    left   : layer.left,
    top    : layer.top,
    width  : layer.width,
    height : layer.height
});

/* internal methods */

// MIGRATIONS transform layer values serialised in a legacy factory format
// which have since been changed in the application. Migrations aim to keep the
// visual result of the legacy properties equal to the new format

/**
 * Prior to FACTORY_VERSION 2, mask properties were direct Layer properties
 */
async function migrateLegacyMask( layer: any ): Promise<Mask | null> {
    return MaskFactory.create({
        source: await base64toCanvas( layer.m, layer.w, layer.h ),
        enabled: true,
        left: layer.x2,
        top: layer.y2,
    });
}
