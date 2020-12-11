<template>
    <div>
        <div ref="canvasContainer" />
    </div>
</template>

<script>
import { mapGetters }     from 'vuex';
import { canvas, sprite } from 'zcanvas';

const width = 400, height = 300;
let zCanvas;

export default {
    computed: {
        ...mapGetters([
            'activeDocument',
        ]),
    },
    watch: {
        activeDocument: {
            deep: true,
            handler({ layers }) {
                if ( !layers ) {
                    return;
                }
                layers.forEach( layer => {
                    if ( !layer.visible ) {
                        return;
                    }
                    // TODO: change detection
                    layer.graphics.forEach(({ bitmap, x, y, width, height }) => {
                        const graphic = new sprite({
                            bitmap, x, y, width, height
                        });
                        graphic.setDraggable( true )
                        zCanvas.addChild( graphic );
                    });
                });
            },
        },
    },
    mounted() {
        zCanvas = new canvas({
            width,
            height,
            animate: true,
            smoothing: true,
            stretchToFit: false,
            fps: 60
        });
        zCanvas.insertInPage( this.$refs.canvasContainer );
    },
};
</script>
