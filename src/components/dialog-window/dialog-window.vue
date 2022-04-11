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
        @keyup.enter="handleConfirm()"
        @keyup.esc="handleCancel()"
    >
        <h4 class="dialog-window__title">{{ title }}</h4>
        <p class="dialog-window__message">{{ message }}</p>
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
        handleConfirm() {
            this.confirmHandler?.();
            this.close();
        },
        handleCancel() {
            this.cancelHandler?.();
            this.close();
        },
        close() {
            this.closeDialog();
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/typography";
@import "@/styles/ui";

.dialog-window {
    @include overlay();
    @include noSelect();
    @include boxSize();

    width: auto;
    height: auto;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background-image: $color-window-bg;
    padding: $spacing-small $spacing-large $spacing-large;
    border-radius: $spacing-small;
    box-shadow: 0 0 25px rgba(0,0,0,.5);

    &__title {
        @include customFont();
        margin: $spacing-medium 0;
        color: $color-4;
        font-weight: bold;
        font-size: 115%;
    }

    &__message {
        white-space: pre-line;
    }

    button {
        display: inline-block;
        width: 45%;
        margin-right: $spacing-medium;
    }

    @include large() {
        max-width: 480px;
    }

    @include mobile() {
        border-radius: 0;
        width: 100%;
        height: 100%;

        button {
            display: block;
            width: 100%;
        }
    }

    &__actions {
        margin: $spacing-small 0;
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
