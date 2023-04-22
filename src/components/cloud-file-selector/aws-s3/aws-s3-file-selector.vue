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
<script lang="ts">
import type { Component } from "vue";
import { mapMutations } from "vuex";
import CloudFileSelector from "../cloud-file-selector.vue";
import type { FileNode } from "../cloud-file-selector.vue";
import S3ImagePreview from "./aws-s3-image-preview.vue";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import { getS3Service } from "@/utils/cloud-service-loader";

let listFolder, createFolder, downloadFileAsBlob, deleteEntry;

 export default {
     extends: CloudFileSelector,
     data: () => ({
         LAST_FOLDER_STORAGE_KEY: "bpy_s3Db",
         STORAGE_PROVIDER: STORAGE_TYPES.S3,
     }),
     computed: {
         imagePreviewComponent(): Component {
             return S3ImagePreview;
         },
     },
     async created(): Promise<void> {
         ({ listFolder, createFolder, downloadFileAsBlob, deleteEntry } = await getS3Service() );
         this.tree.path = "";

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
             "setS3Connected",
         ]),
         /* base component overrides */
         _getServicePathForNode( node: FileNode ): string {
             return node.key ?? node.path;
         },
         async _listFolder( path: string ): Promise<FileNode[]> {
             const entries = await listFolder( path );
             this.setS3Connected( true ); // opened browser implies we have a valid connection
             return entries;
         },
         async _createFolder( parent: string, name: string ): Promise<Boolean> {
             return createFolder( parent, name );
         },
         async _downloadFile( node: FileNode, returnAsURL = false  ): Promise<Blob | string | null> {
            return downloadFileAsBlob( node.key, returnAsURL );
         },
         async _deleteEntry( node: FileNode ): Promise<boolean> {
             return deleteEntry( node.key );
         },
         _mapEntry( entry: FileNode, children = [], parent = null ): FileNode {
             if ( entry.name.endsWith( PROJECT_FILE_EXTENSION )) {
                 entry.type = PROJECT_FILE_EXTENSION;
             }
             return {
                 ...entry,
                 path : entry.name,
                 children,
                 parent,
             };
         },
     }
 };
 </script>
