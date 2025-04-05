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
    <div class="select-box-wrapper">
        <vue-select
            :options="options"
            :searchable="searchable"
            :disabled="disabled"
            :clearable="false"
            v-model="internalValue"
            class="select"
            append-to-body
        />
    </div>
</template>

<script>
import VueSelect from "vue-select";
import "vue-select/dist/vue-select.css";

export default {
    emits: [ "update:modelValue" ],
    props: {
        modelValue: {
            type: [ String, Number ],
            default: null,
        },
        options: {
            type: Array,
            default: () => ([]),
        },
        searchable: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    components: {
        VueSelect,
    },
    computed: {
        internalValue: {
            get() {
                return this.options.find(({ value }) => value === this.modelValue );
            },
            set({ value }) {
                this.$emit( "update:modelValue", value );
            }
        },
    }
};
</script>

<style lang="scss">
@use "@/styles/_colors";
@use "@/styles/_variables";
@use "@/styles/_mixins";
@use "@/styles/form";

$dropdownHeight: variables.$spacing-xlarge;

.select-box-wrapper {
    display: inline-block;
    width: form.$inputWidth;
}

.vs__dropdown-toggle {
    border-radius: variables.$spacing-small;
    background-color: #FFF;
    border-color: #FFF;
    padding: 0;
    height: $dropdownHeight;
}

.vs--disabled {
    .vs__dropdown-toggle {
        background-color: colors.$color-bg;
        border-color: colors.$color-bg;
    }
    input,
    .vs__actions {
        display: none;
    }
}

.vs__selected {
    margin: variables.$spacing-xsmall variables.$spacing-small;
    font-size: 95%;
}

.vs__selected-options {
    height: $dropdownHeight;
    @include mixins.truncate();
}
</style>
