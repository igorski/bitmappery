/**
* The MIT License (MIT)
*
* Igor Zinken 2019-2022 - https://www.igorski.nl
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
        <div class="component__header">
            <slot name="header" />
            <button
                type="button"
                class="component__header-button"
                @click="closeModal()"
            >&#215;</button>
        </div>
        <div ref="content" class="component__content">
            <div class="component__content-wrapper">
                <slot name="content" />
            </div>
            <div class="component__actions">
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
    unmounted() {
        window.removeEventListener( "keyup", this.escListener );
    }
};
</script>
<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_variables";
@use "@/styles/component";
@use "@/styles/typography";
@use "@/styles/ui";

.modal {
    @include ui.overlay();
    @include component.component();
    @include ui.modalBase( 480px, 320px );

    & {
        background-image: colors.$color-window-bg;
        $headerHeight: 48px;

        :deep(.component__header) {
            height: $headerHeight;
            padding: 0 variables.$spacing-medium 0 #{variables.$spacing-medium + variables.$spacing-small};
            border: none;
        }

        :deep(.component__title) {
            @include typography.customFont();
            color: #FFF;
            padding-left: 0;
        }

        :deep(.component__header-button) {
            @include ui.closeButton();
            top: #{variables.$spacing-xsmall + variables.$spacing-small};
            right: #{variables.$spacing-medium + variables.$spacing-small};
        }

        :deep(.component__content) {
            position: relative;
            height: calc(100% - #{$headerHeight});
            padding: variables.$spacing-medium #{variables.$spacing-medium + variables.$spacing-small};
        }

        :deep(.component__content-wrapper) {
            overflow-x: hidden;
            overflow-y: auto;
            height: inherit;
        }

        :deep(.component__actions) {
            @include ui.actionsFooter();
        }
    }
}
</style>
