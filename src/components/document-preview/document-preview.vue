/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
        class="document-preview"
        :class="{
            'document-preview--landscape' : isLandscape,
            'document-preview--actual'    : isActualSize
        }"
    >
        <div class="document-preview__meta">
            <p class="document-preview__meta_title">{{ title }}</p>
            <p class="document-preview__meta_size">{{ fileSize }}</p>
        </div>
        <div
            class="document-preview__container"
            ref="previewContainer"
            @scroll="handleScroll( $event )"
        >
            <img
                :src="blobURL"
                class="document-preview__image"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { blobToResource, disposeResource } from "@/utils/resource-manager";
import { displayAsKb, displayAsMb } from "@/utils/string-util";

export type PreviewScrollPos = {
    left: number,
    top: number
};

export default {
    emits: [ "scroll" ],
    props: {
        src: {
            type: Blob,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        isActualSize: {
            type: Boolean,
            default: true,
        },
        isLandscape: {
            type: Boolean,
            required: true,
        },
    },
    data: () => ({
        blobURL: "",
    }),
    computed: {
        fileSize(): string {
            const bytes = this.src.size;
            
            return bytes < 1000000 ? displayAsKb( bytes ) : displayAsMb( bytes );
        },
    },
    watch: {
        src: {
            immediate: true,
            handler( value: Blob ): void {
                this.disposeExisting();
                this.blobURL = blobToResource( value );
            }
        },
    },
    unmounted(): void {
        this.disposeExisting();
    },
    methods: {
        handleScroll( e: Event ) :void {
            const { scrollLeft, scrollTop } = e.target as HTMLDivElement;
            this.$emit( "scroll", { left: scrollLeft, top: scrollTop });
        },
        setScroll({ left, top }: PreviewScrollPos ): void {
            this.$refs.previewContainer.scrollLeft = left;
            this.$refs.previewContainer.scrollTop  = top;
        },
        disposeExisting(): void {
            if ( !!this.blobURL ) {
                disposeResource( this.blobURL );
                this.blobURL = "";
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";

$metaHeight: 80px;

.document-preview {
    overflow: hidden;

    @include mixins.componentIdeal( variables.$preview-ideal-width, variables.$preview-ideal-height ) {
        height: variables.$preview-max-height;
    }

    &__meta {
        width: 100%;
        border: 1px solid colors.$color-lines;
        padding: 0 variables.$spacing-medium;
        margin-bottom: variables.$spacing-small;
        box-sizing: border-box;
        max-height: $metaHeight;

        &_title {
            font-weight: bold;
            margin-bottom: 0;
        }

        &_size {
            margin-top: 0;
        }
    }

    &__container {
        overflow-x: auto;
        overflow-y: auto;
        height: calc(100% - $metaHeight);
    }

    &__image {
        width: 100%;
    }

    &--landscape {
        .document-preview__image {
            width: auto;
            height: 100%;
        }
    }

    &--actual {
        .document-preview__container {
            overflow-x: auto;
        }

        .document-preview__image {
            width: auto !important;
            height: auto !important;
        }
    }
}
</style>