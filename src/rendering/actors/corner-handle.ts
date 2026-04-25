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
import { sprite } from "zcanvas";
import type { Viewport } from "zcanvas";
import { applySelection } from "@/model/actions/selection-apply";
import type { Shape } from "@/model/types/selection";
import { getCanvasInstance } from "@/services/canvas-service";
import { clone } from "@/utils/object-util";
import { isInsideViewport } from "@/utils/renderer-util";

export enum HandleTypes {
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_RIGHT,
    BOTTOM_LEFT,
};

const HANDLE_SIZE = 25;

class CornerHandle extends sprite
{
    private _type: HandleTypes;
    private _shape: Shape;
    private _orgShape: Shape;
    private _render = false;

    constructor( type: HandleTypes ) {
        super({
            interactive: true,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
        });
        this._type = type;
        this.setDraggable( true );
    }

    public setShape( shape: Shape, zoomFactor: number ): void {
        this._shape = shape;
        this._render = shape?.length === 5;
        
        if ( !this._render ) {
            return; // selection still being created / unclosed
        }
        const { width, height } = this._bounds;
        switch ( this._type ) {
            case HandleTypes.TOP_LEFT:
                this._bounds.left = this._shape[ 0 ].x; // should be equal to 3.x
                this._bounds.top = this._shape[ 0 ].y; // should be equal to 1.y
                break;
            case HandleTypes.TOP_RIGHT:
                this._bounds.left = this._shape[ 1 ].x - width; // should be equal to 2.x
                this._bounds.top = this._shape[ 1 ].y; // should be equal to 0.y
                break;
            case HandleTypes.BOTTOM_RIGHT:
                this._bounds.left = this._shape[ 2 ].x - width; // should be equal to 1.x
                this._bounds.top = this._shape[ 2 ].y - height; // should be equal to 3.y
                break;
            case HandleTypes.BOTTOM_LEFT:
                this._bounds.left = this._shape[ 3 ].x; // should be equal to 0.x
                this._bounds.top = this._shape[ 3 ].y - height; // should be equal to 2.y
                break;
        }
        this._bounds.width = HANDLE_SIZE / zoomFactor;
        this._bounds.height = HANDLE_SIZE / zoomFactor;
    }

    override handlePress( _x: number, _y: number, _event: Event ) {
        this._orgShape = clone( this._shape );
    }
    
    override handleMove( x: number, y: number, _event: Event ) {
        this.updateSelection( x, y );
    }

    override handleRelease( x: number, y: number, _event: Event ) {
        this.updateSelection( x, y );

        const { store } = getCanvasInstance();
        applySelection( store, store.getters.activeDocument, [ this._orgShape ], "resize" );
   }

    override draw( ctx: CanvasRenderingContext2D, viewport: Viewport ): void {
        if ( !this._render || !isInsideViewport( this._bounds, viewport )) {
            return;
        }
        const localLeft = this._bounds.left - viewport.left;
        const localTop = this._bounds.top - viewport.top;
        const localWidth = this._bounds.width;
        const localHeight = this._bounds.height;

        ctx.lineWidth = 4 / this.canvas.zoomFactor;
        ctx.strokeStyle = "#000";

        ctx.beginPath();
        
        switch ( this._type ) {
            case HandleTypes.TOP_LEFT:
                ctx.moveTo( localLeft + localWidth, localTop );
                ctx.lineTo( localLeft, localTop );
                ctx.lineTo( localLeft, localTop + localHeight );
                break;
            case HandleTypes.TOP_RIGHT:
                ctx.moveTo( localLeft, localTop );
                ctx.lineTo( localLeft + localWidth, localTop );
                ctx.lineTo( localLeft + localWidth, localTop + localHeight);
                break;
            case HandleTypes.BOTTOM_RIGHT:
                ctx.moveTo( localLeft + localWidth, localTop );
                ctx.lineTo( localLeft + localWidth, localTop + localHeight );
                ctx.lineTo( localLeft, localTop + localHeight );
                break;
            case HandleTypes.BOTTOM_LEFT:
                ctx.moveTo( localLeft, localTop );
                ctx.lineTo( localLeft, localTop + localHeight );
                ctx.lineTo( localLeft + localWidth, localTop + localHeight );
                break;
        }
        ctx.stroke();
    }

    private updateSelection( x: number, y: number ): void {
        const deltaX = x - this._dragStartEventCoordinates.x;
        const deltaY = y - this._dragStartEventCoordinates.y;

        let index = 0;
        let otherX = 0;
        let otherY = 0;

        switch ( this._type ) {
            case HandleTypes.TOP_LEFT:
                index = 0;
                otherX = 3;
                otherY = 1;
                break;
            case HandleTypes.TOP_RIGHT:
                index = 1;
                otherX = 2;
                otherY = 0;
                break;
            case HandleTypes.BOTTOM_RIGHT:
                index = 2;
                otherX = 1;
                otherY = 3;
                break;
            case HandleTypes.BOTTOM_LEFT:
                index = 3;
                otherX = 0;
                otherY = 2;
                break;
        }
        this._shape[ index ].x = this._orgShape[ index ].x + deltaX;
        this._shape[ index ].y = this._orgShape[ index ].y + deltaY;
        this._shape[ otherX ].x = this._orgShape[ otherX ].x + deltaX;
        this._shape[ otherY ].y = this._orgShape[ otherY ].y + deltaY;

        // keep selection within bounds

        const minX = this._orgShape[ 0 ].x + this._bounds.width;
        const maxX = this._orgShape[ 1 ].x - this._bounds.width;
        const minY = this._orgShape[ 0 ].y + this._bounds.height;
        const maxY = this._orgShape[ 2 ].y - this._bounds.height;

        if ( this._shape[ 0 ].x > maxX ) {
            this._shape[ 0 ].x = this._shape[ 3 ].x = maxX;
        } else if ( this._shape[ 1 ].x < minX ) {
            this._shape[ 1 ].x = this._shape[ 2 ].x = minX;
        }
        if ( this._shape[ 0 ].y > maxY ) {
            this._shape[ 0 ].y = this._shape[ 1 ].y = maxY;
        } else if ( this._shape[ 2 ].y < minY ) {
            this._shape[ 2 ].y = this._shape[ 3 ].y = minY;
        }

        this._shape[ 4 ].x = this._shape[ 0 ].x;
        this._shape[ 4 ].y = this._shape[ 0 ].y;
    }
}
export default CornerHandle;