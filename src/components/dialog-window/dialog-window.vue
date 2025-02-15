/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2022 - https://www.igorski.nl
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
        class="dialog-window"
        ref="windowOutline"
        tabindex="0"
        @keyup.enter="handleConfirm( $event )"
        @keyup.esc="handleCancel()"
    >
        <h4 class="dialog-window__title">{{ title }}</h4>
        <p class="dialog-window__message">{{ message }}</p>
        <a v-if="link" class="dialog-window__link" target="_blank" rel="noopener noreferrer" :href="link.href">{{ link.title }}</a>
        <div class="dialog-window__actions">
            <button
                v-t="'ok'"
                type="button"
                class="button"
                @click="handleConfirm()"
            ></button>
            <button
                v-t="'cancel'"
                v-if="type === 'confirm'"
                type="button"
                class="button"
                @click="handleCancel()"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapMutations } from "vuex";
import messages from "./messages.json";

export default {
    i18n: { messages },
    props: {
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true,
            validator: value => /info|confirm|error/.test(value)
        },
        link: {
            type: Object,
            default: null,
        },
        confirmHandler: {
            type: Function,
            default: null,
        },
        cancelHandler: {
            type: Function,
            default: null,
        }
    },
    methods: {
        ...mapMutations([
            'closeDialog',
        ]),
        handleConfirm( event ) {
            this.confirmHandler?.();
            event?.preventDefault();
            event?.stopPropagation();
            this.close();
        },
        handleCancel() {
            this.cancelHandler?.();
            this.close();
        },
        close() {
            this.closeDialog();
        }
    },
    mounted() {
        this.focusedElement = document.activeElement;
        this.$refs.windowOutline?.focus();
    },
    beforeUnmount() {
        this.focusedElement?.focus();
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/typography";
@use "@/styles/ui";

.dialog-window {
    @include ui.overlay();
    @include mixins.noSelect();
    @include mixins.boxSize();

    width: auto;
    height: auto;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background-image: colors.$color-window-bg;
    padding: variables.$spacing-small variables.$spacing-large variables.$spacing-large;
    border-radius: variables.$spacing-small;
    box-shadow: 0 0 25px rgba(0,0,0,.5);

    &:focus {
        outline: none;
    }

    &__title {
        @include typography.customFont();
        margin: variables.$spacing-medium 0;
        color: colors.$color-4;
        font-weight: bold;
        font-size: 115%;
    }

    &__message {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: pre-line;
    }

    &__link {
        display: block;
        margin-bottom: variables.$spacing-medium;
    }

    button {
        display: inline-block;
        width: 45%;
        margin-right: variables.$spacing-medium;
    }

    @include mixins.large() {
        max-width: 480px;
    }

    @include mixins.mobile() {
        border-radius: 0;
        width: 100%;
        height: 100%;

        button {
            display: block;
            width: 100%;
        }
    }

    &__actions {
        margin: variables.$spacing-small 0;
        display: flex;
        justify-content: space-between;

        button {
            border: 2px solid #555;

            &:hover {
                border: none;
            }
        }
    }
}
</style>
