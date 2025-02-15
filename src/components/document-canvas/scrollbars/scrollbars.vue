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
    <div>
        <div
            ref="horScroll"
            class="scroll scroll--horizontal"
            @mousedown="handlePointerDown"
            @touchstart="handlePointerDown"
        >
            <div
                v-if="canScrollHorizontally"
                class="scroll__handle"
                :style="horHandleStyle"
            ></div>
        </div>
        <div
            ref="verScroll"
            class="scroll scroll--vertical"
            @mousedown="handlePointerDown"
            @touchstart="handlePointerDown"
        >
            <div
                v-if="canScrollVertically"
                class="scroll__handle"
                :style="verHandleStyle"
            ></div>
        </div>
    </div>
</template>

<script>
import { mapState } from "vuex";

const MOVE_EVENTS = [ "mousemove", "touchmove", "wheel" ];
const UP_EVENTS   = [ "mouseup", "touchend", "touchcancel" ];

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
        x: 0, // the "scrollLeft" position
        y: 0, // the "scrollTop" position
    }),
    computed: {
        ...mapState([
            "windowSize",
        ]),
        horHandleStyle() {
            return {
                left: `${this.horHandlePos}px`,
                width: `${this.horHandleSize}px`
            };
        },
        verHandleStyle() {
            return {
                top: `${this.verHandlePos}px`,
                height: `${this.verHandleSize}px`
            };
        },
        canScrollHorizontally() {
            return this.scrollWidth > 0;
        },
        canScrollVertically() {
            return this.scrollHeight > 0;
        }
    },
    watch: {
        windowSize() {
            this.calcDimensions();
        },
    },
    mounted() {
        this.upHandler   = this.handlePointerUp.bind( this );
        this.moveHandler = this.handleScroll.bind( this );

        Object.keys( this.$props ).forEach( name => {
            this.$watch( name, () => this.calcDimensions());
        });
        this.calcDimensions();
    },
    methods: {
        calcDimensions() {
            this.trackWidth  = this.$refs.horScroll.offsetWidth;
            this.trackHeight = this.$refs.verScroll.offsetHeight;

            this.scrollWidth  = this.contentWidth  - this.viewportWidth;
            this.scrollHeight = this.contentHeight - this.viewportHeight;

            this.horHandleSize = ( this.viewportWidth  / this.contentWidth )  * this.trackWidth;
            this.verHandleSize = ( this.viewportHeight / this.contentHeight ) * this.trackHeight;
        },
        handlePointerDown( e ) {
            this.hasHorizontalScroll = e.target === this.$refs.horScroll;
            this.hasVerticalScroll   = e.target === this.$refs.verScroll;

            UP_EVENTS.forEach( type => {
                window.addEventListener( type, this.upHandler );
            });
            MOVE_EVENTS.forEach( type => {
                window.addEventListener( type, this.moveHandler, { passive: false });
            });
        },
        handlePointerUp() {
            this.hasHorizontalScroll = false;
            this.hasVerticalScroll   = false;

            UP_EVENTS.forEach( type => {
                window.removeEventListener( type, this.upHandler );
            });
            MOVE_EVENTS.forEach( type => {
                window.removeEventListener( type, this.moveHandler );
            });
        },
        handleScroll( e ) {
            if ( e.target !== this.$refs.horScroll && e.target !== this.$refs.verScroll ) {
                return;
            }
            let pointerX = e.offsetX;
            let pointerY = e.offsetY;

            // touch event handling
            const touches = e.touches || e.changedTouches;
            if ( touches && touches.length ) {
                pointerX = touches[ 0 ].pageX;
                pointerY = touches[ 0 ].pageY;
                e.preventDefault(); // prevent page bounce
            }

            if ( this.hasHorizontalScroll ) {
                this.x = Math.max( 0, pointerX / this.trackWidth ); // is % of total
                this.positionHorizontalHandle();
            }
            if ( this.hasVerticalScroll ) {
                this.y = Math.max( 0, pointerY / this.trackHeight ); // is % of total
                this.positionVerticalHandle();
            }
            this.$emit( "input", { left: this.x, top: this.y });
        },
        update( left, top ) {
            this.x = isNaN( left ) ? 0 : left;
            this.y = isNaN( top )  ? 0 : top;

            this.positionHorizontalHandle();
            this.positionVerticalHandle();
        },
        positionHorizontalHandle() {
            this.horHandlePos = ( this.trackWidth - this.horHandleSize ) * this.x;
        },
        positionVerticalHandle() {
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
