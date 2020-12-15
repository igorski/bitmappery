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
        <div v-if="loading" v-t="'loading'"></div>
        <div v-else
             class="content"
        >
            <div v-if="leaf">
                {{ leaf.name }}
                <button v-for="node in leaf.children"
                        :key="node.path"
                        type="button"
                        @click="handleNodeClick( node )"
                >{{ node.name }}</button>
            </div>
        </div>
    </div>
</template>

<script>
import { mapMutations } from "vuex";
import { loader }       from "zcanvas";
import ImageToDocumentManager             from "@/mixins/image-to-document-manager";
import { listFolder, downloadFileAsBlob } from "@/services/dropbox-service";
import messages from "./messages.json";

function mapEntry( entry, children = [] ) {
    return {
        type: entry[ ".tag" ], // folder/file
        name: entry.name,
        id: entry.id,
        path: entry.path_lower,
        children,
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
    created() {
        this.retrieveFiles( this.tree.path );
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "closeModal",
        ]),
        async retrieveFiles( path ) {
            this.loading = true;
            try {
                const { result } = await listFolder( path );
                const leaf = findLeafByPath( this.tree, path );
                // populate leaf with fetched children
                leaf.children = result?.entries?.map( mapEntry ) ?? [];
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
                    this.addLoadedFile({ name: node.name }, { image, size });
                    this.closeModal();
                    break;
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";

.dropbox-file-modal {
    @include overlay();
    @include component();

    h2 {
        color: #FFF;
    }

    @include large() {
        $width: 480px;
        $height: 300px;

        width: $width;
        height: $height;
        left: calc(50% - #{$width / 2});
        top: calc(50% - #{$height / 2});
    }
}
</style>
