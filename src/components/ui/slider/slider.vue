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
    <div class="input-slider">
        <input
            v-if="!textInput"
            v-model.number="internalValue"
            type="range"
            class="range-slider"
            :class="{
                'range-slider--large': large
            }"
            :min="min"
            :max="max"
            :step="step"
            :disabled="disabled"
            @keyup.enter="toggleTextInput( true )"
            @dblclick="toggleTextInput( true )"
            @touchstart="handleTouchStart()"
            @pointerdown="handleDragStart()"
            @pointerup="handleDragEnd()"
            v-tooltip.top="internalTextValue"
        />
        <input
            v-else
            ref="textInput"
            type="number"
            class="input-field"
            :min="min"
            :max="max"
            :step="step"
            :value="internalTextValue"
            @change="handleTextChange( $event )"
            @focus="handleTextFocus()"
            @blur="handleTextBlur()"
            @keyup.enter="toggleTextInput( false )"
        />
    </div>
</template>

<script lang="ts">
import { type PropType } from "vue";
import KeyboardService from "@/services/keyboard-service";
import { fixedFloat } from "@/utils/string-util";

const DOUBLE_TAP_THRESHOLD = 500;

export default {
    emits: [ "update:modelValue", "dragStart", "dragEnd" ],
    props: {
        modelValue: {
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
        large: {
            type: Boolean,
            default: true,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        /**
         * Optional transformation functions that change the textual representation
         * of the numerical value (for instance for sliders controlling normalised
         * model values that use a different scaled representation in user terms)
         */
        textGetter: {
            type: Function as PropType<( value: number ) => any>,
            required: false,
        },
        textSetter: {
            type: Function as PropType<( value: number ) => any>,
            required: false,
        },
    },
    data: () => ({
        textInput: false,
    }),
    computed: {
        internalValue: {
            get(): number {
                return this.modelValue;
            },
            set( value: string ): void {
                const numericalValue = parseFloat( value );
                if ( isNaN( numericalValue )) {
                    return;
                }
                this.$emit( "update:modelValue", numericalValue );
            }
        },
        internalTextValue: {
            get(): string {
                if ( this.textGetter ) {
                    return fixedFloat( this.textGetter( this.internalValue ), this.digits );
                }
                return fixedFloat( this.internalValue, this.digits );
            },
            set( value: number ): void {
                let transformedValue: number;
                if ( this.textSetter ) {
                    transformedValue = this.textSetter( value );
                } else {
                    transformedValue = value;
                }

                // keep in range
                if ( transformedValue < this.min ) {
                    this.internalValue = this.min;
                } else if ( transformedValue > this.max ) {
                    this.internalValue = this.max;
                } else {
                    this.internalValue = transformedValue;
                }
            },
        },
        digits(): number {
            const strStep = this.step.toString();
            if ( strStep.includes( "." )) {
                return strStep.split( "." )[ 1 ].length;
            }
            return 0;
        },
    },
    created(): void {
        this.touchDown = 0;
    },
    methods: {
        toggleTextInput( enabled: boolean ): void {
            this.textInput = enabled;

            if ( enabled ) {
                this.$nextTick(() => {
                    this.$refs.textInput?.focus();
                });
            }
        },
        handleTextFocus(): void {
            this.wasSuspended = KeyboardService.getSuspended();
            KeyboardService.setSuspended( true );
        },
        handleTextBlur(): void {
            KeyboardService.setSuspended( this.wasSuspended );
            this.toggleTextInput( false );
        },
        handleTextChange( e: Event ): void {
            this.internalTextValue = e.target.value;
        },
        handleTouchStart(): void {
            const now = Date.now();
            if ( now - this.touchDown < DOUBLE_TAP_THRESHOLD ) {
                this.toggleTextInput( !this.textInput );
            }
            this.touchDown = now;
        },
        handleDragStart(): void {
            this.$emit( "dragStart" );
        },
        handleDragEnd(): void {
            this.$emit( "dragEnd" );
        },
    }
};
</script>

<style lang="scss" scoped>
@use "sass:color";
@use "sass:math";

@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";

$track-color: #333;
$thumb-color: #FFF;
$thumb-color-hover: #FFF;
$thumb-color-disabled: #666;

$thumb-radius: 50%;
$thumb-height: variables.$spacing-medium;
$thumb-width: $thumb-height;
$mobile-thumb-height: 40px;
$mobile-thumb-width: 40px;
$thumb-shadow-size: 1px;
$thumb-shadow-blur: 2px;
$thumb-shadow-color: #111;
$thumb-border-width: 2px;
$thumb-border-color: color.scale($thumb-color-hover, $lightness: -5%);

$track-width: 100%;
$track-height: variables.$spacing-small;
$track-height-large: variables.$spacing-medium;
$track-shadow-size: 0;
$track-shadow-blur: 1px;
$track-shadow-color: colors.$color-lines;
$track-border-width: 1px;
$track-border-color: #000;

$track-radius: 5px;
$contrast: 5%;

@mixin shadow($shadow-size, $shadow-blur, $shadow-color) {
    box-shadow: $shadow-size $shadow-size $shadow-blur $shadow-color, 0 0 $shadow-size color.scale($shadow-color, $lightness: 5%);
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
    margin: #{variables.$spacing-medium - variables.$spacing-xsmall} 0;
    width: $track-width;
    background-color: transparent;

    &:focus {
        outline: none;
    }

    &.range-slider--large {
        &::-webkit-slider-runnable-track {
            height: $track-height-large;
            @include shadow($track-shadow-size, $track-shadow-blur, $track-shadow-color);
        }

        &::-moz-range-track {
            height: $track-height-large;
            @include shadow($track-shadow-size, $track-shadow-blur, $track-shadow-color);
        }

        &::-ms-track {
            height: $track-height-large;
        }

        &::-webkit-slider-thumb {
            margin-top: math.div( -$track-border-width * 2 + $track-height-large, 2 ) - math.div( $thumb-height - $thumb-border-width, 2 );
        }
    }

    &::-webkit-slider-runnable-track {
        @include track();
        background: $track-color;
        border-radius: $track-radius;
        // border: $track-border-width solid $track-border-color;
    }

    &::-webkit-slider-thumb {
        @include thumb();
        -webkit-appearance: none;
        margin-top: math.div( -$track-border-width * 2 + $track-height, 2 ) - math.div( $thumb-height - $thumb-border-width, 2 );
    }

    &:focus::-webkit-slider-runnable-track {
        background: color.scale($track-color, $lightness: $contrast);
    }

    &::-moz-range-track {
        @include track();
        background: $track-color;
        border-radius: $track-radius;
        // border: $track-border-width solid $track-border-color;
    }

    &::-moz-range-thumb {
        @include thumb();
    }

    &::-ms-track {
        @include track();
        background: transparent;
        border-color: transparent;
        border-width: $thumb-width 0;
        color: transparent;
    }

    &::-ms-fill-lower {
        background: color.scale($track-color, $lightness: -$contrast);
        border: $track-border-width solid $track-border-color;
        border-radius: $track-radius*2;
    }
    &::-ms-fill-upper {
        background: $track-color;
        border: $track-border-width solid $track-border-color;
        border-radius: $track-radius*2;
    }

    &::-ms-thumb {
        @include thumb();
    }
    
    &:focus::-ms-fill-lower {
        background: $track-color;
    }
    &:focus::-ms-fill-upper {
        background: color.scale($track-color, $lightness: $contrast);
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

@include mixins.mobile() {
    input[type=range] {
        &::-webkit-slider-thumb {
            width: $mobile-thumb-width;
            height: $mobile-thumb-height;
            margin-top: math.div( $track-height, 2 ) - math.div( $mobile-thumb-height, 2 );
            transform: scale(.5);
        }

        &.range-slider--large {
            &::-webkit-slider-thumb {
                margin-top: math.div( $track-height-large, 2 ) - math.div( $mobile-thumb-height, 2 );
            }
        }
    }
}

.input-slider {
    height: variables.$spacing-xlarge;
}

.input-field {
    width: 100% !important;
    text-align: center;
}
</style>
