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
    <div class="dropbox-file-modal">
        <h2 v-t="'files'"></h2>
        <button
            type="button"
            class="close-button"
            @click="closeModal()"
        >&#215;</button>
        <div class="content">
            <div v-if="leaf">
                <div class="breadcrumbs">
                    <!-- parent folders -->
                    <button v-for="parent in breadcrumbs"
                            :key="parent.path"
                            type="button"
                            @click="handleNodeClick( parent )"
                    >{{ parent.name || "./" }}</button>
                    <!-- current folder -->
                    <button
                        type="button"
                        class="active"
                    >{{ leaf.name }}</button>
                </div>
                <template v-if="!loading">
                    <!-- files and folders within current leaf -->
                    <p v-if="!filesAndFolders.length" v-t="'noImageFiles'"></p>
                    <template v-else>
                        <template v-for="node in filesAndFolders">
                            <div
                                v-if="node.type === 'folder'"
                                :key="`folder_${node.path}`"
                                class="entry entry__folder"
                                @click="handleNodeClick( node )"
                            >
                                <span class="title">{{ node.name }}</span>
                            </div>
                            <div
                                v-else-if="node.type === 'bpy'"
                                :key="`document_${node.path}`"
                                class="entry entry__document"
                                @click="handleNodeClick( node )"
                            >
                                <span class="title">{{ node.name }}</span>
                            </div>
                            <dropbox-image-preview
                                v-else
                                :key="`preview_${node.path}`"
                                :path="node.path"
                                class="image-preview"
                                @click="handleNodeClick( node )"
                            />
                        </template>
                    </template>
                </template>
            </div>
        </div>
    </div>
</template>

<script>
import { mapMutations, mapActions } from "vuex";
import { loader } from "zcanvas";
import ImageToDocumentManager from "@/mixins/image-to-document-manager";
import { listFolder, downloadFileAsBlob } from "@/services/dropbox-service";
import DropboxImagePreview from "./dropbox-image-preview";
import { truncate } from "@/utils/string-util";
import { disposeResource } from "@/utils/resource-manager";
import { ACCEPTED_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION } from "@/definitions/image-types";
import messages from "./messages.json";

// we allow listing of both BitMappery Documents and all accepted image types
const FILE_EXTENSIONS = [ ...ACCEPTED_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION ];

const LAST_DROPBOX_FOLDER = "bpy_dropboxDb";

function mapEntry( entry, children = [], parent = null ) {
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
    }
}

function findLeafByPath( tree, path ) {
    let node = tree;
    while ( node ) {
        if ( node.path === path ) {
            return node;
        }
        const found = recurseChildren( node, path );
        if ( found ) {
            return found;
        }
    }
    return null;
}

function recurseChildren( node, path ) {
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

export default {
    i18n: { messages },
    components: {
        DropboxImagePreview,
    },
    mixins: [ ImageToDocumentManager ],
    data: () => ({
        loading: false,
        tree: {
            type: "folder",
            name: "",
            path: "",
            children: [],
        },
        leaf: null,
    }),
    computed: {
        breadcrumbs() {
            let parent = this.leaf.parent;
            const out = [];
            while ( parent ) {
                out.push( parent );
                parent = parent.parent;
            }
            return out.reverse();
        },
        filesAndFolders() {
            return this.leaf.children.filter( entry => {
                // only show folders and image files
                if ( entry.type === "file" ) {
                    return FILE_EXTENSIONS.some( ext => entry.name.includes( `.${ext}` ));
                }
                return true;
            });
        },
    },
    created() {
        let pathToRetrieve = this.tree.path;
        try {
            const { tree, path } = JSON.parse( sessionStorage.getItem( LAST_DROPBOX_FOLDER ));
            this.tree = { ...this.tree, ...tree };
            pathToRetrieve = path;
        } catch {
            // no tree stored in SessionStorage, continue.
        }
        this.retrieveFiles( pathToRetrieve );
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "closeModal",
            "showNotification",
            "setDropboxConnected",
            "setLoading",
            "unsetLoading",
        ]),
        ...mapActions([
            "loadDocument",
        ]),
        async retrieveFiles( path ) {
            this.loading = true;
            try {
                const entries = await listFolder( path );
                this.setDropboxConnected( true ); // opened browser implies we have a valid connection

                const leaf   = findLeafByPath( this.tree, path );
                const parent = { type: "folder", name: leaf.name, parent: leaf.parent, path };
                // populate leaf with fetched children
                leaf.children = ( entries?.map( entry => mapEntry( entry, [], parent )) ?? [] )
                    .sort(( a, b ) => {
                        if ( a.type < b.type ) {
                            return 1;
                        } else if ( a.type > b.type ) {
                            return -1;
                        }
                        return a.name.localeCompare( b.name );
                    });
                this.leaf = leaf;
            } catch {
                this.openDialog({ type: "error", message: this.$t( "couldNotRetrieveFilesForPath", { path } ) });
                sessionStorage.removeItem( LAST_DROPBOX_FOLDER );
            }
            this.loading = false;
        },
        async handleNodeClick( node ) {
            this.setLoading( "dbox" );
            switch ( node.type ) {
                case "folder":
                    await this.retrieveFiles( node.path );
                    // cache the currently visited tree
                    sessionStorage.setItem( LAST_DROPBOX_FOLDER, JSON.stringify({ path: node.path, tree: this.tree }));
                    break;
                case "bpy":
                    const blob = await downloadFileAsBlob( node.path );
                    blob.name = node.name;
                    this.loadDocument( blob );
                    this.closeModal();
                    break;
                case "file":
                    // TODO: loader, error handling and background load (for bulk selection)
                    const url = await downloadFileAsBlob( node.path, true );
                    const { image, size } = await loader.loadImage( url );
                    await this.addLoadedFile({ type: "dropbox", name: node.name }, { image, size });
                    disposeResource( url ); // Blob has been converted to Layer source
                    this.showNotification({
                        message: this.$t( "importedFileSuccessfully", { file: truncate( node.name, 35 ) })
                    });
                    this.closeModal();
                    break;
            }
            this.unsetLoading( "dbox" );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";
@import "@/styles/typography";

.dropbox-file-modal {
    @include overlay();
    @include component();

    h2 {
        color: #FFF;
    }

    @include large() {
        width: 80%;
        height: 75%;
        max-width: 1280px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    .content {
        overflow: auto;
    }
}

.breadcrumbs {
    padding: $spacing-medium 0;
    margin-bottom: $spacing-small;
    background-color: #b6b6b6;

    button {
        display: inline;
        position: relative;
        margin-right: $spacing-small;
        border: none;
        background: none;
        padding: 0 $spacing-small;
        border-left: 1px solid $color-lines;
        font-size: 100%;
        @include customFont();

        &:hover, &.active {
            color: #FFF;
        }
    }
}

.entry {
    display: inline-block;
    width: 128px;
    height: 128px;
    vertical-align: top;
    position: relative;
    cursor: pointer;
    @include customFont();

    &:hover {
        background-color: $color-1;
        color: #FFF;
    }

    .title {
        position: absolute;
        bottom: $spacing-medium;
        width: 100%;
        text-align: center;
        @include truncate();
    }

    &__folder {
        background: url("../../assets/images/folder.png") no-repeat 50% $spacing-xlarge;
        background-size: 50%;
    }

    &__document {
        background: url("../../assets/icons/icon-bpy.svg") no-repeat 50% $spacing-xlarge;
        background-size: 50%;
    }
}
</style>
