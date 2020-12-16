/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
        class="image-preview"
        :class="{ 'loading': isLoading }"
    >
        <img v-if="isLoading"
             src="@/assets/animations/loader.svg"
             class="loader"
        />
        <img v-else
             :src="src"
             v-on="$listeners"
        />
    </div>
</template>

<script>
import { getThumbnail } from "@/services/dropbox-service";
export default {
    props: {
        path: {
            type: String,
            required: true,
        },
    },
    data: () => ({
        src: null,
    }),
    computed: {
        isLoading() {
            return !this.src;
        },
    },
    async mounted() {
        this.src = await getThumbnail( this.path );
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

.image-preview {
    display: inline-block;
    margin: 0 $spacing-xxsmall;
    overflow: hidden;
    cursor: pointer;

    &.loading {
        width: 64px;
        height: 64px;
    }
}

.loader {
    margin: #{(64 - 30) / 2 }px;
    width: 30px;
    height: 30px;
}
</style>
