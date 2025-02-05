/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
        v-on="$listeners"
    >
        <p
            v-if="hasNoThumb"
        >{{ node.name }}</p>
        <img
            v-if="isLoading"
            src="../../../assets-inline/animations/loader.svg"
            class="image-preview__loader"
        />
        <img
            v-else
            :src="src"
            class="image-preview__image"
            @load="handleImageLoad"
        />
    </div>
</template>

<script>
import { getS3Service } from "@/utils/cloud-service-loader";
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
        hasNoThumb: false,
    }),
    computed: {
        isLoading() {
            return !this.src;
        },
    },
    async created() {
        ({ getThumbnail } = await getS3Service() );
        getThumbnail( this.node.key, true ).then( blobUrl => {
            if ( blobUrl === null ) {
                this.hasNoThumb = true;
            }
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
@import "@/styles/_mixins";

.image-preview {
    background: url("../../../assets-inline/images/icon-bpy.svg") no-repeat 50% $spacing-xlarge;
    background-size: 50%;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}
</style>
