/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2025 - https://www.igorski.nl
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
    <div
        class="context-menu menu-list"
        :style="position"
    ><slot></slot></div>
</template>

<script lang="ts">
export default {
    emits: [ "close" ],
    props: {
        x: {
            type: Number,
            required: true,
        },
        y: {
            type: Number,
            required: true,
        },
    },
    data: () => ({
        offsetX: 0,
        offsetY: 0,
    }),
    computed: {
        position(): { left: string, top: string } {
            return {
                left : `${this.x + this.offsetX}px`,
                top  : `${this.y + this.offsetY}px`
            };
        },
    },
    mounted(): void {
        this.closeHandler = this.handleClose.bind( this );

        document.addEventListener( "click",       this.closeHandler );
        document.addEventListener( "contextmenu", this.closeHandler );

        if ( this.$el.children.length > 0 ) {
            this.syncPosition();
        } else {
            // on first mount we need to watch for the child menu injection
            this.observer = new MutationObserver(() => {
                this.syncPosition();
            });
            this.observer.observe( this.$el, {
                childList : true,
                subtree   : true 
            });
        }
    },
    beforeUnmount(): void {
        document.removeEventListener( "click", this.closeHandler );
        document.removeEventListener( "contextmenu", this.closeHandler );
        this.observer?.disconnect();
    },
    methods: {
        handleClose(): void {
            this.$emit( "close" );
        },
        syncPosition(): void {
            const bounds = this.$el.children[ 0 ]?.getBoundingClientRect();
            if ( bounds ) {
                const { width, height } = bounds;

                const MARGIN = 24;

                // we center the context menu around the cursor
                
                const halfWidth  = width  / 2;
                const halfHeight = height / 2;

                // but keep the window inside visible bounds when spawned from the edges

                const { innerWidth, innerHeight } = window;

                if (( this.x + halfWidth ) > innerWidth ) {
                    this.offsetX = (( innerWidth - this.x ) - ( width + MARGIN ));
                } else {
                    this.offsetX = -halfWidth;
                }
                
                if (( this.y + halfHeight ) > innerHeight ) {
                    this.offsetY = (( innerHeight - this.y ) - ( height + MARGIN ));
                } else {
                    this.offsetY = -halfHeight;
                }
            }
        },
    },
}
</script>

<style lang="scss" scoped>
@use "@/styles/_mixins";
@use "@/styles/colors";
@use "@/styles/ui";

.context-menu {
    position: fixed;
    background-image: colors.$color-window-bg;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    min-width: 280px;
    height: fit-content;

    @include ui.nestedMenu();
}

.context-menu div {
    padding: 10px;
    cursor: pointer;

    &:hover {
        background-color: #f0f0f0;
    }
}
</style>