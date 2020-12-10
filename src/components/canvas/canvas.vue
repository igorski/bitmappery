<template>
    <div>
        <canvas ref="canvasContainer" />
    </div>
</template>

<script>
import { canvas } from 'zcanvas';

const width = 400, height = 300;
let zCanvas;

export default {
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
