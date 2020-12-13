import { sprite }       from "zcanvas";
import { createCanvas } from "@/utils/canvas-util";

function DrawableLayer({ width, height }) {
    const { cvs, ctx } = createCanvas( width, height );
    const opts = {
        bitmap: cvs, x: 0, y: 0, width, height
    };
    DrawableLayer.super( this, "constructor", opts ); // zCanvas inheritance

    this.setDraggable( true );

    // TODO: setters and cache for these
    const radius = 30; // TODO: setter
    const innerRadius = 5;
    const outerRadius = 70;
    const opacity = .5; // 0 - 1 range
    ctx.globalAlpha = opacity;

    const { cvs: brush, ctx: brushCtx } = createCanvas( radius * 2, radius * 2 );

    // Radii of the white glow.
    // Radius of the entire circle.

    const x = radius;
    const y = radius;
    const gradient = ctx.createRadialGradient( x, y, innerRadius, x, y, outerRadius );
    gradient.addColorStop( 0, 'rgba(255,0,0,1)' );
    gradient.addColorStop( 1, 'rgba(255,255,255,1)' );

    brushCtx.arc( x, y, radius, 0, 2 * Math.PI );

    brushCtx.fillStyle = gradient;
    brushCtx.fill();

    this.handleMove = function( x, y ) {
        ctx.drawImage( brush, x - radius / 2, y - radius / 2 );
    }
}
sprite.extend( DrawableLayer );
export default DrawableLayer;
