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
    <div
        class="image-preview"
        :class="{ 'loading': isLoading }"
    >
        <img
            v-if="isLoading"
            src="../../../assets-inline/animations/loader.svg"
            class="image-preview__loader"
        />
        <img
            v-else
            :src="src"
            v-on="$listeners"
            class="image-preview__image"
            @load="handleImageLoad"
        />
    </div>
</template>

<script>
import { getDropboxService } from "@/utils/cloud-service-loader";
import { disposeResource } from "@/utils/resource-manager";

let getThumbnail;

export default {
    props: {
        node: {
            type: Object,
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
    async created() {
        ({ getThumbnail } = await getDropboxService() );
        getThumbnail( this.node.path, true ).then( blobUrl => {
                if ( this._destroyed ) {
                    disposeResource( blobUrl );
                } else {
                    this.src = blobUrl;
                }
            });
    },
    unmounted() {
        this._destroyed = true;
    },
    methods: {
        handleImageLoad() {
            // free memory allocated by dropbox-service#getThumbnail()
            disposeResource( this.src );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@import "@/styles/_mixins";

.image-preview {
    display: inline-block;
    margin: 0 $spacing-xxsmall;
    overflow: hidden;
    cursor: pointer;
    vertical-align: middle;

    &__loader {
        width: $spacing-xxlarge;
        height: $spacing-xxlarge;
        margin: math.div(128px - $spacing-xxlarge, 2);
    }

    &__image {
        object-fit: cover;
        width: calc(100% - #{$spacing-small});
        height: calc(100% - #{$spacing-small});

        &:hover {
            transform: scale(1.05);
            transform-origin: center;
        }
    }
}
</style>
