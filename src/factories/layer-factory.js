/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
import { LAYER_GRAPHIC, DEFAULT_LAYER_NAME } from "@/definitions/layer-types";
import { imageToBase64, base64toCanvas } from "@/utils/canvas-util";
import EffectsFactory from "@/factories/effects-factory";
import FiltersFactory from "@/factories/filters-factory";
import TextFactory    from "@/factories/text-factory";

let UID_COUNTER = 0;

const LayerFactory = {
    /**
     * Creates a new layer for use within a Document
     */
    create({
        name = DEFAULT_LAYER_NAME,
        type = LAYER_GRAPHIC, transparent = true, source = null, mask = null,
        left = 0, top = 0, maskX = 0, maskY = 0, width = 1, height = 1, visible = true,
        effects = {}, filters = {}, text = {}
    } = {}) {
        return {
            id: `layer_${( ++UID_COUNTER )}`,
            name,
            type,
            source,
            transparent,
            mask,
            left,
            top,
            maskX,
            maskY,
            width,
            height,
            visible,
            text: TextFactory.create( text ),
            effects: EffectsFactory.create( effects ),
            filters: FiltersFactory.create( filters ),
        }
    },

    /**
     * Saving layer properties into a simplified JSON structure
     * for project storage
     */
    serialize( layer ) {
        return {
            n: layer.name,
            t: layer.type,
            tr: layer.transparent,
            s: imageToBase64( layer.source, layer.width, layer.height, layer.transparent ),
            m: imageToBase64( layer.mask,   layer.width, layer.height, true ),
            x: layer.left,
            y: layer.top,
            x2: layer.maskX,
            y2: layer.maskY,
            w: layer.width,
            h: layer.height,
            tx: TextFactory.serialize( layer.text ),
            f: EffectsFactory.serialize( layer.effects ),
            fl: FiltersFactory.serialize( layer.filters ),
            v: layer.visible,
        };
    },

    /**
     * Creating a new layer instance from a stored layer structure
     * inside a stored project
     */
    async deserialize( layer ) {
        const source = await base64toCanvas( layer.s, layer.w, layer.h );
        const mask   = await base64toCanvas( layer.m, layer.w, layer.h );
        const text   = await TextFactory.deserialize( layer.tx );
        return LayerFactory.create({
            name: layer.n,
            type: layer.t,
            transparent: layer.tr,
            source,
            mask,
            left: layer.x,
            top: layer.y,
            maskX: layer.x2,
            maskY: layer.y2,
            width: layer.w,
            height: layer.h,
            visible: layer.v,
            text,
            effects: EffectsFactory.deserialize( layer.f ),
            filters: FiltersFactory.deserialize( layer.fl ),
        });
    }
};
export default LayerFactory;
