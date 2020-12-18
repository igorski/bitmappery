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
                                class="folder"
                                @click="handleNodeClick( node )"
                            >
                                <span class="title">{{ node.name }}</span>
                            </div>
                            <dropbox-image-preview
                                v-else
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
import { mapMutations } from "vuex";
import { loader }       from "zcanvas";
import ImageToDocumentManager             from "@/mixins/image-to-document-manager";
import { listFolder, downloadFileAsBlob } from "@/services/dropbox-service";
import DropboxImagePreview from "./dropbox-image-preview";
import { truncate } from "@/utils/string-util";
import { ACCEPTED_FILE_EXTENSIONS } from "@/definitions/image-types";
import messages from "./messages.json";

function mapEntry( entry, children = [], parent = null ) {
    return {
        type: entry[ ".tag" ], // folder/file
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
                    return ACCEPTED_FILE_EXTENSIONS.some( ext => entry.name.includes( `.${ext}` ));
                }
                return true;
            });
        },
    },
    created() {
        this.retrieveFiles( this.tree.path );
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "closeModal",
            "showNotification",
        ]),
        async retrieveFiles( path ) {
            this.loading = true;
            try {
                const { result } = await listFolder( path );
                const leaf   = findLeafByPath( this.tree, path );
                const parent = { type: "folder", name: leaf.name, parent: leaf.parent, path };
                // populate leaf with fetched children
                leaf.children = result?.entries?.map( entry => mapEntry( entry, [], parent )) ?? [];
                this.leaf = leaf;
            } catch {
                this.openDialog({ type: "error", message: this.$t( "couldNotRetrieveFilesForPath", { path } ) });
            }
            this.loading = false;
        },
        async handleNodeClick( node ) {
            switch ( node.type ) {
                case "folder":
                    await this.retrieveFiles( node.path );
                    break;
                case "file":
                    // TODO: loader, error handling and background load (for bulk selection)
                    const url = await downloadFileAsBlob( node.path );
                    const { image, size } = await loader.loadImage( url );
                    this.addLoadedFile({ type: "dropbox", name: node.name }, { image, size });
                    this.showNotification({
                        message: this.$t( "importedFileSuccessfully", { file: truncate( node.name, 35 ) })
                    });
                    this.closeModal();
                    break;
            }
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
        $width: 80%;
        $height: 75%;
        width: $width;
        height: $height;
        max-width: 1280px;
        left: calc(50% - #{$width / 2});
        top: calc(50% - #{$height / 2});
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
        @include customFont();

        &:hover, &.active {
            color: #FFF;
        }
    }
}

.folder {
    display: inline-block;
    width: 128px;
    height: 128px;
    vertical-align: top;
    background: url("../../assets/images/folder.png") no-repeat 50% $spacing-xlarge;
    background-size: 50%;
    position: relative;
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
}
</style>
