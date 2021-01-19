/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
        <label v-t="'importLocalFile'"
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
import { mapActions } from "vuex";
import { ACCEPTED_FILE_TYPES }    from "@/definitions/image-types";
import { loadImageFiles }         from "@/services/file-loader-queue";
import ImageToDocumentManager     from "@/mixins/image-to-document-manager";
import { PROJECT_FILE_EXTENSION } from "@/store";
import messages                   from "./messages.json";

// we allow selection of both BitMappery Documents and all accepted image types
const FILE_EXTENSIONS = [ ...ACCEPTED_FILE_TYPES, PROJECT_FILE_EXTENSION ];

export default {
    i18n: { messages },
    mixins: [ ImageToDocumentManager ],
    data: () => ({
        acceptedImageTypes: FILE_EXTENSIONS,
    }),
    methods: {
        ...mapActions([
            "loadDocument",
        ]),
        async handleFileSelect({ target }) {
            const files = target?.files;
            if ( !files || files.length === 0 ) {
                return;
            }

            // separate BitMappery documents from image files

            const bpyDocuments = [];
            const imageFiles   = [];

            for ( let i = 0, l = files.length; i < l; ++i ) {
                const file = files[ i ];
                const [ name, ext ] = file.name.split( "." );
                if ( ext === PROJECT_FILE_EXTENSION.replace( ".", "" )) {
                    bpyDocuments.push( file );
                } else {
                    imageFiles.push( file );
                }
            }

            // load the image files

            const start = Date.now();
            await loadImageFiles( imageFiles, this.addLoadedFile.bind( this ));
            const elapsed = Date.now() - start;

            // load the BitMappery documents

            bpyDocuments.forEach( doc => {
                this.loadDocument( doc );
            });
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
