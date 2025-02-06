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
import type { Component } from "vue";
import { mapState, mapMutations, mapActions } from "vuex";
import { loader } from "zcanvas";
import { ACCEPTED_FILE_EXTENSIONS, isThirdPartyDocument, getMimeForThirdPartyDocument } from "@/definitions/file-types";
import type { FileNode } from "@/definitions/storage-types";
import ImageToDocumentManager from "@/mixins/image-to-document-manager";
import { truncate } from "@/utils/string-util";
import { disposeResource } from "@/utils/resource-manager";

import messages from "./messages.json";

const RETRIEVAL_LOAD_KEY = "cld_r";
const ACTION_LOAD_KEY    = "cld_a";

function recurseChildren( node: FileNode, path: string ): FileNode {
    const { children } = node;
    if ( !Array.isArray( children )) {
        return null;
    }
    for ( let i = 0, l = children.length; i < l; ++i ) {
        const child = children[ i ];
        if ( child.path === path ) {
            return child;
        } else {
            const found = recurseChildren( child, path );
            if ( found ) {
                return found;
            }
        }
    }
    return null;
}

function findLeafByPath( node: FileNode, path: string ): FileNode {
    if ( node.path === path ) {
        return node;
    }
    return recurseChildren( node, path );
}

export default {
    i18n: { messages },
    mixins: [ ImageToDocumentManager ],
    data: () => ({
        LAST_FOLDER_STORAGE_KEY : "x", // define in inheriting component
        STORAGE_PROVIDER        : "", // name of storage provider (e.g. Dropbox, Drive) define in inheriting component
        tree: {
            type: "folder",
            name: "",
            path: "",
            children: [],
        },
        leaf: null,
        newFolderName: "",
    }),
    computed: {
        ...mapState([
            "loadingStates",
        ]),
        loading(): boolean {
            return this.loadingStates.includes( RETRIEVAL_LOAD_KEY );
        },
        disabled(): boolean {
            return this.loadingStates.includes( ACTION_LOAD_KEY );
        },
        breadcrumbs(): FileNode[] {
            let parent = this.leaf.parent;
            const out: FileNode = [];
            while ( parent ) {
                out.push( parent );
                parent = parent.parent;
            }
            return out.reverse();
        },
        filesAndFolders(): FileNode[] {
            return this.leaf.children.filter( entry => {
                // only show folders and image files
                if ( entry.type === "file" ) {
                    return ACCEPTED_FILE_EXTENSIONS.some( ext => entry.name.includes( `.${ext}` ));
                }
                return true;
            });
        },
        imagePreviewComponent(): Component | null {
            return null; // extend in inheriting components
        },
    },
    mounted(): void {
        focus( this.$refs.content );
        this.escListener = ({ keyCode }) => {
            if ( keyCode === 27 ) {
                this.closeModal();
            }
        };
        window.addEventListener( "keyup", this.escListener );
    },
    unmounted(): void {
        window.removeEventListener( "keyup", this.escListener );
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "closeModal",
            "setStorageType",
            "showNotification",
            "setLoading",
            "unsetLoading",
        ]),
        ...mapActions([
            "loadDocument",
        ]),
        async retrieveFiles( path ): Promise<void> {
            this.setLoading( RETRIEVAL_LOAD_KEY );
            try {
                const entries = await this._listFolder( path );
                let leaf = findLeafByPath( this.tree, path );

                if ( !leaf ) {
                    // S3 uses full path keys instead of nested directory names, get last name
                    const dirs = path.split( "/" ).filter( Boolean );
                    leaf = findLeafByPath( this.tree, dirs[ dirs.length - 1 ] );
                }
                const parent = { type: "folder", name: leaf.name, parent: leaf.parent, path };

                // populate leaf with fetched children
                leaf.children = ( entries?.map( entry => this._mapEntry( entry, [], parent )) ?? [] )
                    .sort(( a, b ) => {
                        if ( a.type < b.type ) {
                            return 1;
                        } else if ( a.type > b.type ) {
                            return -1;
                        }
                        return a.name.localeCompare( b.name );
                    });
                this.leaf = leaf;
            } catch ( e: any ) {
                this.openDialog({ type: "error", message: this.$t( "couldNotRetrieveFilesForPath", { path } ) });
                sessionStorage.removeItem( this.LAST_FOLDER_STORAGE_KEY );
            }
            this.unsetLoading( RETRIEVAL_LOAD_KEY );
        },
        async handleCreateFolderClick(): Promise<void> {
            const folder = this.newFolderName;
            this.setLoading( ACTION_LOAD_KEY );
            try {
                const result = await this._createFolder( this.leaf.path, folder );
                if ( !result ) {
                    throw new Error();
                }
                this.retrieveFiles( this._getServicePathForNode( this.leaf ));
                this.newFolderName = "";
                this.showNotification({
                    message: this.$t( "folderCreatedSuccessfully", { folder })
                });
            } catch {
                this.showNotification({
                    message: this.$t( "couldNotCreateFolder", { folder })
                });
            }
            this.unsetLoading( ACTION_LOAD_KEY );
        },
        async handleNodeClick( node: FileNode ): Promise<void> {
            if ( this.disabled ) {
                return;
            }
            this.setLoading( ACTION_LOAD_KEY );
            const path = this._getServicePathForNode( node );
            switch ( node.type ) {
                case "folder":
                    await this.retrieveFiles( path );
                    // cache the currently visited tree
                    sessionStorage.setItem( this.LAST_FOLDER_STORAGE_KEY, JSON.stringify({ path, tree: this.tree }));
                    break;
                case "bpy":
                    const blob = await this._downloadFile( node );
                    blob.name = node.name;
                    this.loadDocument( blob );
                    this.setStorageType( this.STORAGE_PROVIDER );
                    this.closeModal();
                    break;
                case "file":
                    // TODO: error handling and background load (for bulk selection)
                    try {
                        const url = await this._downloadFile( node, true );
                        if ( isThirdPartyDocument( node )) {
                            const blob = await fetch( url ).then( r => r.blob() );
                            await this.loadThirdPartyDocuments([ blob ], getMimeForThirdPartyDocument( node ));
                        } else {
                            const { image, size } = await loader.loadImage( url );
                            this.setStorageType( this.STORAGE_PROVIDER );
                            await this.addLoadedFile({ type: this.STORAGE_PROVIDER, name: node.name }, { image, size });
                        }
                        disposeResource( url ); // Blob has been converted to internal resource
                        this.showNotification({
                            message: this.$t( "importedFileSuccessfully", { file: truncate( node.name, 35 ) })
                        });
                        this.closeModal();
                    } catch {
                        this.openDialog({
                            type: "error",
                            message: this.$t( "errorImportingFile", { file: truncate( node.name, 35 ) })
                        });
                    }
                    break;
            }
            this.unsetLoading( ACTION_LOAD_KEY );
        },
        handleDeleteClick( node: FileNode ): void {
            const { name } = node;
            this.openDialog({
                type: "confirm",
                message: this.$t( "deleteEntryWarning", { entry: name }),
                confirm: async () => {
                    this.setLoading( ACTION_LOAD_KEY );
                    const success = await this._deleteEntry( node );
                    if ( success ) {
                        this.showNotification({
                            message: this.$t( "entryDeletedSuccessfully", { entry: name })
                        });
                        this.retrieveFiles( this._getServicePathForNode( this.leaf ));
                    } else {
                        this.openDialog({
                            type: "error",
                            message: this.$t( "couldNotDeleteEntry", { entry: name })
                        });
                    }
                    this.unsetLoading( ACTION_LOAD_KEY );
                },
            });
        },
        /* the below should be implemented in inheriting components */
        _getServicePathForNode( node: FileNode ): string {
            return node.path;
        },
        // eslint-disable-next-line no-unused-vars
        async _listFolder( path: string ): Promise<FileNode[]> {
            return [];
        },
        // eslint-disable-next-line no-unused-vars
        async _createFolder( parent: FileNode, name: string ): Promise<boolean> {
            return false;
        },
        // eslint-disable-next-line no-unused-vars
        async _downloadFile( node: FileNode, returnAsURL = false  ): Promise<Blob | string | null> {
            return null;
        },
        // eslint-disable-next-line no-unused-vars
        async _deleteEntry( node: FileNode ): Promise<boolean> {
            return false;
        },
        // eslint-disable-next-line no-unused-vars
        _mapEntry( entry: FileNode, children: FileNode[] = [], parent: FileNode = null ): FileNode {
            return {} as FileNode;
        }
    }
};