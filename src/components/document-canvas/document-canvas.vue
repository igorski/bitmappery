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
<template>
    <div class="canvas-wrapper">
        <template v-if="activeDocument">
            <h2>{{ activeDocument.name }}</h2>
            <div class="content" ref="canvasContainer"></div>
        </template>
    </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { canvas }    from "zcanvas";
import DrawableLayer from "@/components/ui/sprites/drawable-layer";
import {
    createSpriteForGraphic, runSpriteFn, flushSpritesInLayer, flushCache,
} from "@/utils/canvas-util";

/* internal methods */

let lastDocument, zCanvas, drawableLayer;

export default {
    computed: {
        ...mapState([
            "windowSize"
        ]),
        ...mapGetters([
            "activeDocument",
            "activeTool",
        ]),
    },
    watch: {
        windowSize() {
            this.scaleCanvas();
        },
        activeDocument: {
            deep: true,
            handler( document ) {
                if ( !document?.layers ) {
                    return;
                }
                const { name, width, height } = document;
                if ( name !== lastDocument ) {
                    lastDocument = name;
                    flushCache(); // switching between documents
                }
                if ( zCanvas.width !== width || zCanvas.height !== height ) {
                    zCanvas.setDimensions( width, height );
                    this.scaleCanvas();
                }
                document.layers.forEach( layer => {
                    if ( !layer.visible ) {
                        flushSpritesInLayer( layer );
                        return;
                    }
                    layer.graphics.forEach( graphic => {
                        const sprite = createSpriteForGraphic( zCanvas, graphic );
                    });
                });
            },
        },
        activeTool( tool ) {
            let isDraggable = false; // sprites only draggable for move tool
            switch ( tool ) {
                default:
                    break;
                case "move":
                    isDraggable = true;
                    break;
                case "brush":
                    if ( !drawableLayer ) {
                        drawableLayer = new DrawableLayer( this.activeDocument );
                        zCanvas.addChild( drawableLayer );
                    }
                    break;
            }
            runSpriteFn( sprite => sprite.setDraggable( isDraggable || sprite instanceof DrawableLayer ));
        }
    },
    mounted() {
        zCanvas = new canvas({
            width: 160,
            height: 90,
            animate: true,
            smoothing: true,
            backgroundColor: "#FFFFFF",
            stretchToFit: false,
            fps: 60
        });
        zCanvas.insertInPage( this.$refs.canvasContainer );
    },
    methods: {
        scaleCanvas() {
            const { width, height } = this.activeDocument;
            const size = this.$el.parentNode?.getBoundingClientRect();
            if ( !size || ( size.width > width && size.height > height )) {
                console.warn("canvas fits");
                return;
            }
            console.warn("canvas must be resized");
            zCanvas.scale( size.width / width );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/component";

.canvas-wrapper {
    display: inline-block;
    @include component();

    .content {
        padding: 0;
    }
}
</style>
