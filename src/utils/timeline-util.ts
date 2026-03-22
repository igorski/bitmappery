/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
import type { Document, Layer, RelId } from "@/definitions/document";

/**
 * Layers can be grouped into tiles by their rel attribute.
 * This method retrieves all layers belonging to a specific tile.
 */
export const getLayersByTile = ( activeDocument: Document, tile: RelId ): Layer[] => {
    return activeDocument.layers.filter( layer => layer.rel.id === tile );
};

/**
 * Retrieves the index (relative to the Documents layer list) of the first layer
 * belonging to the provided tile group.
 */
export const getIndexOfFirstLayerInTileGroup = ( activeDocument: Document, tile: RelId ): number => {
    const firstLayerInTile = activeDocument.layers.find( layer => layer.rel.id === tile );
    return activeDocument.layers.indexOf( firstLayerInTile );
};

/**
 * Retrieves the index (relative to the Documents layer list) of the last layer
 * belonging to the provided tile group.
 */
export const getIndexOfLastLayerInTileGroup = ( activeDocument: Document, tile: RelId ): number => {
    const layers = getLayersByTile( activeDocument, tile );
    return activeDocument.layers.indexOf( layers[ layers.length - 1 ]);
};
