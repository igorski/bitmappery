/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023-2024 - https://www.igorski.nl
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
    <div class="save-s3-document">
        <div class="wrapper input">
            <label v-t="'folder'"></label>
            <input
                type="text"
                v-model="folder"
                class="input-field"
            />
        </div>
        <p v-t="'folderExpl'" class="expl"></p>
    </div>
</template>

<script lang="ts">
import { mapMutations } from "vuex";
import CloudServiceConnector from "@/mixins/cloud-service-connector";
import { getS3Service } from "@/utils/cloud-service-loader";

import sharedMessages from "@/messages.json"; // for CloudServiceConnector
import messages from "./messages.json";

let getCurrentFolder, setCurrentFolder, uploadBlob;

export default {
    i18n: { messages },
    mixins: [ CloudServiceConnector ],
    data: () => ({
        folder: "",
    }),
    computed: {
        isValid(): boolean {
            return this.name.length > 0;
        },
    },
    async created(): Promise<void> {
        ({ getCurrentFolder, setCurrentFolder, uploadBlob } = await getS3Service());
        await this.initS3( false );
        this.folder = getCurrentFolder();
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "showNotification",
            "setLoading",
            "unsetLoading",
        ]),
        async requestSave( blob: Blob, fileName: string ): Promise<void> {
            this.setLoading( "save" );
            try {
                const result = await uploadBlob( blob, this.folder, fileName );
                if ( !result ) {
                    throw new Error();
                }
                setCurrentFolder( this.folder );
                this.showNotification({ message: this.$t( "fileSavedInS3", { file: fileName }) });
            } catch ( e: any ) {
                this.openDialog({ type: "error", message: this.$t( "errorOccurred" ) });
            }
            this.unsetLoading( "save" );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/typography";

.expl {
    @include typography.smallText();
}
</style>
