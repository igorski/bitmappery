/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
import { loader } from "zcanvas";
import { LAYER_GRAPHIC, LAYER_IMAGE, LAYER_MASK } from "@/definitions/layer-types";
import { createCanvas, imageToBase64 } from "@/utils/canvas-util";
let UID_COUNTER = 0;

const LayerFactory = {
    /**
     * Creates a new layer for use within a Document
     */
    create({
        name = "New Layer",
        type = LAYER_GRAPHIC, bitmap = null,
        x = 0, y = 0, width = 1, height = 1, visible = true
    } = {}) {
        return {
            id: `layer_${( ++UID_COUNTER )}`,
            name,
            type,
            bitmap,
            x,
            y,
            width,
            height,
            visible
        }
    },

    /**
     * Saving layer properties into a simplified JSON structure
     * for project storage
     */
    save( layer ) {
        return {
            n: layer.name,
            t: layer.type,
            b: imageToBase64( layer.bitmap, layer.width, layer.height ),
            x: layer.x,
            y: layer.y,
            w: layer.width,
            h: layer.height,
            v: layer.visible,
        };
    },

    /**
     * Creating a new layer instance from a stored layer structure
     * inside a stored project
     */
    async load( layer ) {
        const bitmap = await restoreImageForType( layer.b, layer.t, layer.w, layer.h );
        return LayerFactory.create({
            name: layer.n,
            type: layer.t,
            bitmap,
            x: layer.x,
            y: layer.y,
            width: layer.w,
            height: layer.h,
            visible: layer.v
        });
    }
};
export default LayerFactory;

/* internal methods */

async function restoreImageForType( base64, type, width, height ) {
    const { image, size } = await loader.loadImage( base64 );
    switch ( type ) {
        default:
        case LAYER_GRAPHIC:
        case LAYER_MASK:
            const { cvs, ctx } = createCanvas( width, height );
            ctx.drawImage( image, 0, 0 );
            return cvs;

        case LAYER_IMAGE:
            // TODO: make Blob
            return image;
    }
    return null;
}
