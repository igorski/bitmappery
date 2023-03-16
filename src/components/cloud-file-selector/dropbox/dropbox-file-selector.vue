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
<script>
import { mapMutations } from "vuex";
import CloudFileSelector from "../cloud-file-selector.vue";
import DropboxImagePreview from "./dropbox-image-preview.vue";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { getDropboxService } from "@/utils/cloud-service-loader";

let listFolder, createFolder, downloadFileAsBlob, deleteEntry;

export default {
    extends: CloudFileSelector,
    components: {
        DropboxImagePreview,
    },
    data: () => ({
        LAST_FOLDER_STORAGE_KEY: "bpy_dropboxDb",
        STORAGE_PROVIDER : STORAGE_TYPES.DROPBOX,
    }),
    computed: {
        imagePreviewComponent() {
            return DropboxImagePreview;
        },
    },
    async created() {
        ({ listFolder, createFolder, downloadFileAsBlob, deleteEntry } = await getDropboxService());
        let pathToRetrieve = this.tree.path;
        try {
            const { tree, path } = JSON.parse( sessionStorage.getItem( this.LAST_FOLDER_STORAGE_KEY ));
            this.tree = { ...this.tree, ...tree };
            pathToRetrieve = path;
        } catch {
            // no tree stored in SessionStorage, continue.
        }
        this.retrieveFiles( pathToRetrieve );
    },
    methods: {
        ...mapMutations([
            "setDropboxConnected",
        ]),
        /* base component overrides */
        async _listFolder( path ) {
            const entries = await listFolder( path );
            this.setDropboxConnected( true ); // opened browser implies we have a valid connection
            return entries;
        },
        async _createFolder( parent, name ) {
            return createFolder( parent, name );
        },
        async _downloadFile( node, returnAsURL = false  ) {
            return downloadFileAsBlob( node.path, returnAsURL );
        },
        async _deleteEntry( node ) {
            return deleteEntry( node.path );
        },
        _mapEntry( entry, children = [], parent = null ) {
            let type = entry[ ".tag" ]; // folder/file
            if ( entry.name.endsWith( PROJECT_FILE_EXTENSION )) {
                type = "bpy";
            }
            return {
                type,
                name: entry.name,
                id: entry.id,
                path: entry.path_lower,
                children,
                parent,
            };
        },
    },
};
</script>
