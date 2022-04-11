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
<template>
    <div class="cloud-file-modal">
        <div class="component__header">
            <h2 v-t="'files'" class="component__title"></h2>
            <button
                type="button"
                class="component__header-button"
                @click="closeModal()"
            >&#215;</button>
        </div>
        <div ref="content" class="component__content">
            <div v-if="leaf" class="content__wrapper">
                <div class="breadcrumbs">
                    <!-- parent folders -->
                    <button
                        v-for="parent in breadcrumbs"
                        :key="parent.path"
                        type="button"
                        class="breadcrumbs__button"
                        @click="handleNodeClick( parent )"
                    >{{ parent.name || "." }}</button>
                    <!-- current folder -->
                    <button
                        type="button"
                        class="breadcrumbs__button breadcrumbs__button--active"
                    >{{ leaf.name }}</button>
                </div>
                <div v-if="!loading" class="content__folders">
                    <!-- files and folders within current leaf -->
                    <p v-if="!filesAndFolders.length" v-t="'noImageFiles'"></p>
                    <template v-else>
                        <div
                            v-for="node in filesAndFolders"
                            :key="`entry_${node.path}`"
                            class="entry"
                        >
                            <div
                                v-if="node.type === 'folder'"
                                class="entry__icon entry__icon--folder"
                                @click="handleNodeClick( node )"
                            >
                                <span class="title">{{ node.name }}</span>
                            </div>
                            <div
                                v-else-if="node.type === 'bpy'"
                                class="entry__icon entry__icon--document"
                                @click="handleNodeClick( node )"
                            >
                                <span class="title">{{ node.name }}</span>
                            </div>
                            <component
                                v-else
                                :is="imagePreviewComponent"
                                :node="node"
                                class="entry__icon entry__icon--image-preview"
                                @click="handleNodeClick( node )"
                            />
                            <button
                                type="button"
                                class="entry__delete-button"
                                :title="$t('delete')"
                                @click="handleDeleteClick( node )"
                            >x</button>
                        </div>
                    </template>
                </div>
            </div>
        </div>
        <div class="component__actions">
            <div class="component__actions-content">
                <div class="form component__actions-form">
                    <div class="wrapper input">
                        <input
                            v-model="newFolderName"
                            :placeholder="$t('newFolderName')"
                            type="text"
                            class="input-field full"
                        />
                    </div>
                </div>
                <button
                    v-t="'createFolder'"
                    type="button"
                    class="button"
                    :disabled="!newFolderName"
                    @click="handleCreateFolderClick()"
                ></button>
            </div>
        </div>
    </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from "vuex";
import { loader } from "zcanvas";
import { ACCEPTED_FILE_EXTENSIONS, isThirdPartyDocument } from "@/definitions/file-types";
import ImageToDocumentManager from "@/mixins/image-to-document-manager";
import { truncate } from "@/utils/string-util";
import { disposeResource } from "@/utils/resource-manager";

import messages from "./messages.json";

const RETRIEVAL_LOAD_KEY = "cld_r";
const ACTION_LOAD_KEY    = "cld_a";

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

function findLeafByPath( node, path ) {
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
        loading() {
            return this.loadingStates.includes( RETRIEVAL_LOAD_KEY );
        },
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
                    return ACCEPTED_FILE_EXTENSIONS.some( ext => entry.name.includes( `.${ext}` ));
                }
                return true;
            });
        },
        imagePreviewComponent() {
            return null; // extend in inheriting components
        },
    },
    mounted() {
        focus( this.$refs.content );
        this.escListener = ({ keyCode }) => {
            if ( keyCode === 27 ) {
                this.closeModal();
            }
        };
        window.addEventListener( "keyup", this.escListener );
    },
    destroyed() {
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
        async retrieveFiles( path ) {
            this.setLoading( RETRIEVAL_LOAD_KEY );
            try {
                const entries = await this._listFolder( path );

                const leaf   = findLeafByPath( this.tree, path );
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
            } catch {
                this.openDialog({ type: "error", message: this.$t( "couldNotRetrieveFilesForPath", { path } ) });
                sessionStorage.removeItem( this.LAST_FOLDER_STORAGE_KEY );
            }
            this.unsetLoading( RETRIEVAL_LOAD_KEY );
        },
        async handleCreateFolderClick() {
            const folder = this.newFolderName;
            this.setLoading( ACTION_LOAD_KEY );
            try {
                const result = await this._createFolder( this.leaf.path, folder );
                if ( !result ) {
                    throw new Error();
                }
                this.retrieveFiles( this.leaf.path );
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
        async handleNodeClick( node ) {
            this.setLoading( ACTION_LOAD_KEY );
            switch ( node.type ) {
                case "folder":
                    await this.retrieveFiles( node.path );
                    // cache the currently visited tree
                    sessionStorage.setItem( this.LAST_FOLDER_STORAGE_KEY, JSON.stringify({ path: node.path, tree: this.tree }));
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
                            await this.loadThirdPartyDocuments([ blob ]);
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
        handleDeleteClick( node ) {
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
                        this.retrieveFiles( this.leaf.path );
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
        async _listFolder( path ) {

        },
        async _createFolder( parent, name ) {

        },
        async _downloadFile( node, returnAsURL = false  ) {

        },
        async _deleteEntry( node ) {

        },
        _mapEntry( entry, children = [], parent = null ) {
            return {};
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";
@import "@/styles/form";
@import "@/styles/typography";
@import "@/styles/ui";

$actionsHeight: 74px;

.cloud-file-modal {
    @include overlay();
    @include component();

    .component__title {
        color: #FFF;
    }

    @include large() {
        width: 80%;
        height: 85%;
        max-width: 1280px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    .content__wrapper {
        height: 100%;
    }

    .content__folders {
        overflow: auto;
        height: calc(100% - #{$heading-height + $actionsHeight});
        padding-top: $spacing-small;
    }

    @include mobile() {
        .component__content {
            height: calc(100% - #{$actionsHeight});
        }
    }

    .component__header-button {
        @include closeButton();
    }

    .component__actions {
        @include actionsFooter();
        background-image: $color-window-bg;
        padding: $spacing-xxsmall $spacing-medium;

        &-content {
            display: flex;
            width: 100%;
            max-width: 400px;
            margin-left: auto;
            align-items: baseline;
        }

        &-form {
            flex: 2;
        }
    }
}

.breadcrumbs {
    padding: $spacing-small 0 $spacing-small $spacing-small;
    background-color: $color-bg;

    &__button {
        display: inline;
        position: relative;
        cursor: pointer;
        border: none;
        background: none;
        padding-left: $spacing-xsmall;
        padding-right: 0;
        font-size: 100%;
        @include customFont();

        &:after {
            content: " /";
        }

        &:hover {
            color: $color-4;
        }

        &--active {
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

    .title {
        position: absolute;
        bottom: $spacing-medium;
        width: 100%;
        text-align: center;
        @include truncate();
    }

    &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: inherit;
        height: inherit;

        &--folder {
            background: url("../../assets/images/folder.png") no-repeat 50% $spacing-xlarge;
            background-size: 50%;
        }

        &--document {
            background: url("../../assets/icons/icon-bpy.svg") no-repeat 50% $spacing-xlarge;
            background-size: 50%;
        }
    }

    &__delete-button {
        display: none;
        position: absolute;
        z-index: 1;
        cursor: pointer;
        top: -$spacing-small;
        right: -$spacing-small;
        background-color: #FFF;
        color: $color-1;
        width: $spacing-large;
        height: $spacing-large;
        border: none;
        border-radius: 50%;
    }

    &:hover {
        .entry__icon--folder,
        .entry__icon--document {
            background-color: $color-1;
            color: #FFF;
        }

        .entry__delete-button {
            display: block;
        }
    }
}
</style>
