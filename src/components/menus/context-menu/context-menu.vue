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
    >
        <slot></slot>
    </div>
</template>

<script lang="ts">
const MENU_WIDTH  = 300; // see style
const MENU_HEIGHT = 205;

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
    computed: {
        position(): { left: string, top: string } {
            return {
                left : `${this.x - ( MENU_WIDTH  / 2 )}px`,
                top  : `${this.y - ( MENU_HEIGHT / 2 )}px`
            };
        },
    },
    mounted(): void {
        this.closeHandler = this.handleClose.bind( this );

        document.addEventListener( "click", this.closeHandler );
        document.addEventListener( "contextmenu", this.closeHandler );
    },
    beforeUnmount(): void {
        document.removeEventListener( "click", this.closeHandler );
        document.removeEventListener( "contextmenu", this.closeHandler );
    },
    methods: {
        handleClose(): void {
            this.$emit( "close" );
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
    min-width: 300px;

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