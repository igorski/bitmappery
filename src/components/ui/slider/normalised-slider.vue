/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
    <slider
        :min="0"
        :max="1"
        :step="step"
        :text-getter="denormalise"
        :text-setter="normalise"
    />
</template>

<script lang="ts">
import { type PropType } from "vue";
import Slider from "./slider.vue";

/**
 * normalised-slider presents a slider that can manage a
 * model value in the normalised 0 - 1 range with a neutral
 * setting at the center value of 0.5 (such as used in Filter props)
 */
export default {
    components: { Slider },
    props: {
        step: {
            type: Number,
            default: 0.01,
            validator: ( value: number ) => value > 0 && value <= 1,
        },
        denormalise: {
            type: Function as PropType<( value: number ) => any>,
            required: false,
        },
        normalise: {
            type: Function as PropType<( value: number ) => any>,
            required: false,
        },
    },
};
</script>