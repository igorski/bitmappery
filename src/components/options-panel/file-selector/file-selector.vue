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
    <div class="form">
        <label v-t="'selectLocalImageFile'"
               for="file"
               class="file-label button button--block"
        ></label>
        <input type="file"
               id="file"
               multiple
               :accept="acceptedImageTypes"
               @change="handleFileSelect"
        />
    </div>
</template>

<script>
import { loadImageFiles }     from "@/services/file-loader-queue";
import ImageToDocumentManager from "@/mixins/image-to-document-manager";
import messages               from "./messages.json";

const ACCEPTED_IMAGE_TYPES = [ "image/png", "image/gif", "image/jpeg" ];

export default {
    i18n: { messages },
    mixins: [ ImageToDocumentManager ],
    data: () => ({
        acceptedImageTypes: ACCEPTED_IMAGE_TYPES,
    }),
    methods: {
        async handleFileSelect({ target }) {
            const files = target?.files;
            if ( !files || files.length === 0 ) {
                return;
            }
            const start = Date.now();
            await loadImageFiles( files, this.addLoadedFile.bind( this ));
            const elapsed = Date.now() - start;
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/typography";

#file {
    /* hide this ugly thing, use the label as interaction */
    position: absolute;
    top: 0;
    left: -9999px;
}
</style>
