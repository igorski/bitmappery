/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
    <div class="save-drive-document">
        <div class="wrapper input">
            <label v-t="'folder'"></label>
            <input
                type="text"
                v-model="folder"
                :disabled="loading"
                class="input-field"
            />
        </div>
        <p v-t="'folderExpl'" class="expl"></p>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import DocumentFactory from "@/factories/document-factory";
import CloudServiceConnector from "@/mixins/cloud-service-connector";
import { getGoogleDriveService } from "@/utils/cloud-service-loader";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";

import sharedMessages from "@/messages.json"; // for CloudServiceConnector
import messages from "./messages.json";

let getCurrentFolder, setCurrentFolder, getFolderHierarchy, createFolder, uploadBlob;

export default {
    i18n: { sharedMessages, messages },
    mixins: [ CloudServiceConnector ],
    data: () => ({
        loading   : true,
        folder    : "",
        hierarchy : [],
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
        isValid() {
            return this.name.length > 0;
        },
    },
    async created() {
        ({ getCurrentFolder, setCurrentFolder, getFolderHierarchy, createFolder, uploadBlob } = await getGoogleDriveService() );

        await this.initDrive( false );

        this.hierarchy = await getFolderHierarchy( getCurrentFolder() );
        this.folder = `/${this.hierarchy.map(({ name }) => name ).join( "/" )}`;

        this.loading = false;
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "showNotification",
            "setLoading",
            "unsetLoading",
        ]),
        async requestSave() {
            this.setLoading( "save" );

            // Google Drive doesn't allow creation of multiple nested folders at once.
            // Instead we will need to generate these one by one

            const destHierarchy = this.folder.split( "/" ).filter( Boolean ).map( name => ({
                name,
                id : this.hierarchy.find( folder => folder.name === name )?.id
            }));

            let folderId = "root";
            for ( let i = 0, l = destHierarchy.length; i < l; ++i ) {
                const folder = destHierarchy[ i ];
                // if folder had no id, user entered new value. Create folder into previous parent.
                if ( !folder.id ) {
                    folder.id = await createFolder( folderId, folder.name );
                }
                folderId = folder.id;
            }

            try {
                const blob = await DocumentFactory.toBlob( this.activeDocument );
                const result = await uploadBlob( blob, folderId, `${this.activeDocument.name}.${PROJECT_FILE_EXTENSION}` );
                if ( !result ) {
                    throw new Error();
                }
                setCurrentFolder( folderId );
                this.showNotification({ message: this.$t( "fileSavedInDrive", { file: this.activeDocument.name }) });
            } catch ( e ) {
                this.openDialog({ type: "error", message: this.$t( "errorOccurred" ) });
            }
            this.unsetLoading( "save" );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/typography";

.expl {
    @include smallText();
}
</style>
