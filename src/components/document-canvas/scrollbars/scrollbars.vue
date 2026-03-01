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
<template>
    <div>
        <div
            v-if="canScrollHorizontally"
            ref="horScroll"
            class="scroll scroll--horizontal"
            @mousedown="handlePointerDown"
            @touchstart="handlePointerDown"
        >
            <div
                class="scroll__handle"
                :style="horHandleStyle"
            ></div>
        </div>
        <div
            v-if="canScrollVertically"
            ref="verScroll"
            class="scroll scroll--vertical"
            @mousedown="handlePointerDown"
            @touchstart="handlePointerDown"
        >
            <div
                class="scroll__handle"
                :style="verHandleStyle"
            ></div>
        </div>
    </div>
</template>

<script lang="ts">
import { mapState } from "vuex";
import { type Coordinate } from "zcanvas";

const MOVE_EVENTS = [ "mousemove", "touchmove", "wheel" ];
const UP_EVENTS   = [ "mouseup", "touchend", "touchcancel" ];

/**
 * Wrapper to get uniform coordinates from a pointer / touch event
 * regardless whether it was initiated by mouse pointer or on a touchscreen/pad.
 * By use of preventDefault a side effect can be introduced to stop the default
 * behaviour on touch events (as in the context of scrollbar panning it could
 * trigger a page bounce effect)
 */
function getCoordinate( e: PointerEvent | TouchEvent, preventDefault = true ): Coordinate {
    let x = e.clientX;
    let y = e.clientY;

    // touch event handling
    const touches = e.touches || e.changedTouches;
    if ( touches && touches.length ) {
        x = touches[ 0 ].pageX;
        y = touches[ 0 ].pageY;
        if ( preventDefault ) {
            e.preventDefault();
        }
    }
    return { x, y };
}

function clamp( value: number ) {
    return Math.min( 1, Math.max( 0, value ));
}

export default {
    emits: [ "input" ],
    props: {
        contentWidth: {
            type: Number,
            required: true,
        },
        contentHeight: {
            type: Number,
            required: true,
        },
        viewportWidth: {
            type: Number,
            required: true,
        },
        viewportHeight: {
            type: Number,
            required: true,
        },
    },
    data: () => ({
        hasHorizontalScroll: false,
        hasVerticalScroll: false,
        scrollWidth: 0,
        scrollHeight: 0,
        trackWidth: 0,
        trackHeight: 0,
        horHandlePos: 0,
        horHandleSize: 0,
        verHandlePos: 0,
        verHandleSize: 0,
        x: 0.5, // the "scrollLeft" position, normalized 0 - 1 range
        y: 0.5, // the "scrollTop" position, normalized 0 - 1 range
    }),
    computed: {
        ...mapState([
            "windowSize",
        ]),
        horHandleStyle(): { left: string, width: string } {
            return {
                left: `${this.horHandlePos}px`,
                width: `${this.horHandleSize}px`
            };
        },
        verHandleStyle(): { top: string, height: string } {
            return {
                top: `${this.verHandlePos}px`,
                height: `${this.verHandleSize}px`
            };
        },
        canScrollHorizontally(): boolean {
            return this.scrollWidth > 0;
        },
        canScrollVertically(): boolean {
            return this.scrollHeight > 0;
        },
    },
    watch: {
        windowSize(): void {
            this.calcDimensions();
        },
        canScrollHorizontally( value: boolean ): void {
            if ( value ) {
                this.$nextTick(() => {
                    this.calcDimensions();
                });
            }
        },
        canScrollVertically( value: boolean ): void {
            if ( value ) {
                this.$nextTick(() => {
                    this.calcDimensions();
                });
            }
        },
    },
    mounted(): void {
        this.upHandler   = this.handlePointerUp.bind( this );
        this.moveHandler = this.handleScroll.bind( this );

        Object.keys( this.$props ).forEach( name => {
            this.$watch( name, () => this.calcDimensions());
        });
        this.calcDimensions();
    },
    methods: {
        calcDimensions(): void {
            this.trackWidth  = this.$refs.horScroll?.offsetWidth  ?? this.viewportWidth;
            this.trackHeight = this.$refs.verScroll?.offsetHeight ?? this.viewportHeight;

            this.scrollWidth  = this.contentWidth  - this.viewportWidth;
            this.scrollHeight = this.contentHeight - this.viewportHeight;

            this.horHandleSize = ( this.viewportWidth  / this.contentWidth )  * this.trackWidth;
            this.verHandleSize = ( this.viewportHeight / this.contentHeight ) * this.trackHeight;

            this.$nextTick(() => {
                this.positionHorizontalHandle();
                this.positionVerticalHandle();
            });
        },
        handlePointerDown( e: PointerEvent ): void {
            this.hasHorizontalScroll = e.target === this.$refs.horScroll;
            this.hasVerticalScroll   = e.target === this.$refs.verScroll;

            this.startOffset = getCoordinate( e );
            this.xAtStart = Math.max( 0.05, this.x );
            this.yAtStart = Math.max( 0.05, this.y );
            this.hasScrolled = false;

            UP_EVENTS.forEach( type => {
                window.addEventListener( type, this.upHandler );
            });
            MOVE_EVENTS.forEach( type => {
                window.addEventListener( type, this.moveHandler, { passive: false });
            });
        },
        handlePointerUp( e: PointerEvent | TouchEvent ): void {
            UP_EVENTS.forEach( type => {
                window.removeEventListener( type, this.upHandler );
            });
            MOVE_EVENTS.forEach( type => {
                window.removeEventListener( type, this.moveHandler );
            });

            if ( !this.hasScrolled && !( e instanceof TouchEvent )) {
                if ( this.hasHorizontalScroll ) {
                    this.x = clamp( e.offsetX / this.trackWidth );
                    this.positionHorizontalHandle();
                }
                if ( this.hasVerticalScroll ) {
                    this.y = clamp( e.offsetY / this.trackHeight );
                    this.positionVerticalHandle();
                }
                this.$emit( "input", { left: this.x, top: this.y });
            }
        },
        handleScroll( e: PointerEvent | TouchEvent ): void {
            const { x, y } = getCoordinate( e );

            // the coordinate values here are in normalized 0 - 1 range
            
            let targetX = this.xAtStart / this.startOffset.x * x;
            let targetY = this.yAtStart / this.startOffset.y * y;

            if ( this.hasHorizontalScroll ) {
                this.x = clamp( targetX );
                this.positionHorizontalHandle();
            }
            if ( this.hasVerticalScroll ) {
                this.y = clamp( targetY );
                this.positionVerticalHandle();
            }
            this.hasScrolled = true;
            this.$emit( "input", { left: this.x, top: this.y });
        },
        update( left: number, top: number, emit = false ): void {
            this.x = isNaN( left ) ? 0 : clamp( left );
            this.y = isNaN( top )  ? 0 : clamp( top );

            this.$nextTick(() => {
                this.positionHorizontalHandle();
                this.positionVerticalHandle();

                if ( emit ) {
                    this.$emit( "input", { left: this.x, top: this.y });
                }
            });
        },
        positionHorizontalHandle(): void {
            this.horHandlePos = ( this.trackWidth - this.horHandleSize ) * this.x;
        },
        positionVerticalHandle(): void {
            this.verHandlePos = ( this.trackHeight - this.verHandleSize ) * this.y;
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";

$size: variables.$spacing-medium;

.scroll {
    position: absolute;
    background-color: colors.$color-2;
    cursor: pointer;

    &__handle {
        position: absolute;
        background-color: colors.$color-bg;
        border-radius: variables.$spacing-small;
        @include mixins.noEvents(); /* the background captures the events */
    }

    &--vertical {
        right: -$size;
        top: 0;
        width: $size;
        height: 100%;

        .scroll__handle {
            width: 100%;
            min-height: 5px;
        }
    }

    &--horizontal {
        bottom: -$size;
        left: 0;
        width: 100%;
        height: $size;

        .scroll__handle {
            height: 100%;
            min-width: 5px;
        }
    }
}
</style>
