/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
    <div class="slider-input">
        <input
            v-if="!textInput"
            v-model.number="internalValue"
            type="range"
            class="range-slider"
            :min="min"
            :max="max"
            :step="step"
            :disabled="disabled"
            @dblclick="toggleTextInput( true )"
        />
        <input
            v-else
            v-model.number="internalValue"
            ref="textInput"
            type="number"
            class="input-field full"
            :min="min"
            :max="max"
            :step="step"
            @focus="handleTextFocus()"
            @blur="handleTextBlur()"
            @keyup.enter="toggleTextInput( false )"
        />
    </div>
</template>

<script>
import KeyboardService from "@/services/keyboard-service";

export default {
    props: {
        value: {
            type: Number,
            default: 0
        },
        min: {
            type: Number,
            default: 0,
        },
        max: {
            type: Number,
            default: 100,
        },
        step: {
            type: Number,
            default: 0.1,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    data: () => ({
        textInput: false,
    }),
    computed: {
        internalValue: {
            get() {
                return this.value;
            },
            set( value ) {
                const numericalValue = parseFloat( value );
                if ( isNaN( numericalValue )) {
                    return;
                }
                this.$emit( "input", numericalValue );
            }
        },
    },
    methods: {
        toggleTextInput( enabled ) {
            this.textInput = enabled;
        },
        handleTextFocus() {
            this.wasSuspended = KeyboardService.getSuspended();
            KeyboardService.setSuspended( true );
        },
        handleTextBlur() {
            KeyboardService.setSuspended( this.wasSuspended );
            this.toggleTextInput( false );
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

$track-color: #333;
$thumb-color: #FFF;
$thumb-color-hover: #FFF;
$thumb-color-disabled: #666;

$thumb-radius: 50%;
$thumb-height: $spacing-medium;
$thumb-width: $spacing-medium;
$mobile-thumb-height: 40px;
$mobile-thumb-width: 40px;
$thumb-shadow-size: 1px;
$thumb-shadow-blur: 2px;
$thumb-shadow-color: #111;
$thumb-border-width: 2px;
$thumb-border-color: darken($thumb-color-hover, 5%);

$track-width: 100%;
$track-height: $spacing-medium;
$track-shadow-size: 0;
$track-shadow-blur: 2px;
$track-shadow-color: #000;
$track-border-width: 1px;
$track-border-color: #000;

$track-radius: 5px;
$contrast: 5%;

@mixin shadow($shadow-size, $shadow-blur, $shadow-color) {
    box-shadow: $shadow-size $shadow-size $shadow-blur $shadow-color, 0 0 $shadow-size lighten($shadow-color, 5%);
}

@mixin track() {
    width: $track-width;
    height: $track-height;
    cursor: pointer;
}

@mixin thumb() {
    @include shadow($thumb-shadow-size, $thumb-shadow-blur, $thumb-shadow-color);
    border: $thumb-border-width solid $thumb-border-color;
    height: $thumb-height;
    width: $thumb-width;
    border-radius: $thumb-radius;
    background: $thumb-color;
    cursor: pointer;

    &:hover {
        background: $thumb-color-hover;
    }
}

input[type=range] {
    -webkit-appearance: none;
    margin: $thumb-height/2 0;
    width: $track-width;
    background-color: transparent;

    &:focus {
        outline: none;
    }

    &::-webkit-slider-runnable-track {
        @include track;
        @include shadow($track-shadow-size, $track-shadow-blur, $track-shadow-color);
        background: $track-color;
        border-radius: $track-radius;
        border: $track-border-width solid $track-border-color;
    }

    &::-webkit-slider-thumb {
        @include thumb;;
        -webkit-appearance: none;
        margin-top: ((-$track-border-width * 2 + $track-height) / 2) - ($thumb-height / 2);
    }

    &:focus::-webkit-slider-runnable-track {
        background: lighten($track-color, $contrast);
    }

    &::-moz-range-track {
        @include track;
        @include shadow($track-shadow-size, $track-shadow-blur, $track-shadow-color);
        background: $track-color;
        border-radius: $track-radius;
        border: $track-border-width solid $track-border-color;
    }
    &::-moz-range-thumb {
        @include thumb;;
    }

    &::-ms-track {
        @include track;
        background: transparent;
        border-color: transparent;
        border-width: $thumb-width 0;
        color: transparent;
    }

    &::-ms-fill-lower {
        background: darken($track-color, $contrast);
        border: $track-border-width solid $track-border-color;
        border-radius: $track-radius*2;
        @include shadow($track-shadow-size, $track-shadow-blur, $track-shadow-color);
    }
    &::-ms-fill-upper {
        background: $track-color;
        border: $track-border-width solid $track-border-color;
        border-radius: $track-radius*2;
        @include shadow($track-shadow-size, $track-shadow-blur, $track-shadow-color);
    }
    &::-ms-thumb {
        @include thumb;;
    }
    &:focus::-ms-fill-lower {
        background: $track-color;
    }
    &:focus::-ms-fill-upper {
        background: lighten($track-color, $contrast);
    }

    // disabled state

    &:disabled {
        &::-webkit-slider-thumb {
            background: $thumb-color-disabled;
            border-color: $thumb-color-disabled;
        }
        &::-moz-range-thumb {
            background: $thumb-color-disabled;
            border-color: $thumb-color-disabled;
        }
        &::-ms-thumb {
            background: $thumb-color-disabled;
            border-color: $thumb-color-disabled;
        }
    }
}

@include mobile() {
    input[type=range] {
        &::-webkit-slider-thumb {
            width: $mobile-thumb-width;
            height: $mobile-thumb-height;
            margin-top: ((-$track-border-width * 2 + $track-height) / 2) - ($mobile-thumb-height / 2);
            transform: scale(.5);
        }
    }
}
</style>
