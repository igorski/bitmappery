/**
* The MIT License (MIT)
*
* Igor Zinken 2019-2021 - https://www.igorski.nl
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
    <div class="modal">
        <slot name="header" />
        <button
            type="button"
            class="close-button"
            @click="closeModal()"
        >&#215;</button>
        <div ref="content" class="content">
            <div class="content-wrapper">
                <slot name="content" />
            </div>
            <div class="actions">
                <slot name="actions" />
            </div>
        </div>
    </div>
</template>

<script>
import { mapMutations } from "vuex";
import { focus } from "@/utils/environment-util";

export default {
    methods: {
        ...mapMutations([
            "closeModal",
        ]),
    },
    mounted() {
        focus( this.$refs.content );
        this.escListener = ({ keyCode }) => {
            if ( keyCode === 27 ) {
                this.closeModal();
            }
        };
        window.addEventListener( "keyup", this.escListener );
    },
    destroyed() {
        window.removeEventListener( "keyup", this.escListener );
    }
};
</script>
<style lang="scss" scoped>
@import "@/styles/component";

.modal {
    @include overlay();
    @include component();
    $headerHeight: 50px;

    h2 {
        color: #FFF;
    }

    .content {
        position: relative;
        height: calc(100% - #{$headerHeight});
    }

    .content-wrapper {
        overflow-y: auto;
        height: inherit;
        label {
            font-weight: bold;
            color: #FFF;
        }
    }

    .actions {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        text-align: center;
        display: flex;
        padding: $spacing-small $spacing-medium;
        box-sizing: border-box;

        button {
            flex: 1;
            margin: $spacing-small;
        }

        @include mobile() {
            position: fixed;
        }
    }

    @include large() {
        $actionsHeight: 74px;
        $width: 480px;
        $height: 340px;

        width: $width;
        height: $height + $actionsHeight;
        left: calc(50% - #{$width / 2});
        top: calc(50% - #{($height + $actionsHeight) / 2});
    }
}
</style>
