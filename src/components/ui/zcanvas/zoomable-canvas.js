import { canvas } from "zcanvas";

function ZoomableCanvas( opts ) {
    ZoomableCanvas.super( this, "constructor", opts ); // zCanvas inheritance

    this.setZoomFactor = function( xScale, yScale ) {
        // we debounce this as setDimensions() is only updating size
        // on render. This zoom factor logic should move into the zCanvas
        // library where updateCanvasSize() takes this additional factor into account
        window.requestAnimationFrame(() => {
            this._canvasContext.scale( xScale, yScale );
        });
        this.invalidate();
    };
    this.setZoomFactor( 1 );
}
canvas.extend( ZoomableCanvas );
export default ZoomableCanvas;
