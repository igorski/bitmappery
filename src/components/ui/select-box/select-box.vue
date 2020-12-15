/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019-2020 - https://www.igorski.nl
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
    <model-select :options="options"
                  v-model="internalValue"
                  class="select"
    />
</template>

<script>
import { ModelSelect } from "vue-search-select";
import "semantic-ui-css/components/dropdown.min.css"
import "vue-search-select/dist/VueSearchSelect.css";

export default {
    props: {
        value: {
            type: String,
            default: null,
        },
        options: {
            type: Array,
            default: () => ([]),
        },
    },
    components: {
        ModelSelect,
    },
    computed: {
        internalValue: {
            get() {
                return this.value;
            },
            set( value ) {
                this.$emit( "input", value );
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.select {
    display: inline-block !important; // semantic-ui-css override
    &.small-list {
        max-width: 65px;
    }
    &.medium-list {
        max-width: 100px;
    }
    &.large-list {
        max-width: 200px;
    }
    .text {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        width: 100%;
    }
}
</style>
