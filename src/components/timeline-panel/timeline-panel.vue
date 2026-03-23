/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2026 - https://www.igorski.nl
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
    <div class="timeline">
        <div class="component__header">
            <div class="component__title" v-t="'timeline'"></div>
            <button
                type="button"
                v-t="'add'"
                @click="handleAdd()"
            ></button>
            <button
                type="button"
                v-t="'play'"
                @click="handlePlay()"
            ></button>
        </div>
        <div class="component__content">
            <div class="timeline__tiles">
                <canvas
                    v-for="tile in activeDocument.groups"
                    :ref="`thumb_${tile}`"
                    class="timeline__tile"
                    @click.stop.prevent="setActiveGroup( tile )"
                    @contextmenu.stop.prevent="showContextMenu( $event, tile )"
                    :class="{
                        'timeline__tile--active': tile === activeGroup
                    }"
                >
                </canvas>
            </div>
        </div>
        <context-menu
            v-if="contextMenu.show"
            @close="contextMenu.show = false"
            :x="contextMenu.x"
            :y="contextMenu.y"
        >
            <ul class="submenu">
                <li>
                    <button
                        type="button"
                        v-t="'clone'"
                        @click.prevent="handleClone()"
                    ></button>
                </li>
                <li>
                    <button
                        type="button"
                        v-t="'delete'"
                        @click.prevent="handleDelete()"
                    ></button>
                </li>
            </ul>
        </context-menu>
    </div>
</template>

<script lang="ts">
import { defineAsyncComponent } from "vue";
import { mapGetters, mapMutations } from "vuex";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import type { Document, RelId } from "@/definitions/document";
import { ANIMATION_PREVIEW } from "@/definitions/modal-windows";
import { createGroupTile, flushTileCache, subscribe, type Tile, unsubscribe } from "@/rendering/cache/tile-cache";
import { addTile } from "@/store/actions/tile-add";
import { cloneTile } from "@/store/actions/tile-clone";
import { deleteTile } from "@/store/actions/tile-delete";
import { SmartExecutor } from "@/utils/debounce-util";
import { getAllTileGroupsInDocument, getIndexOfFirstLayerInTileGroup } from "@/utils/timeline-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        ContextMenu : defineAsyncComponent({ loader: () => import( "@/components/menus/context-menu/context-menu.vue" ) }),
        ToggleButton,
    },
    data: () => ({
        contextMenu: {
            tile: "",
            show: false,
            x: 0,
            y: 0,
        },
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "activeGroup",
            "layers",
        ]),
    },
    watch: {
        activeDocument: {
            immediate: true,
            handler( document?: Document ): void {
                flushTileCache();
                if ( document ) {
                    this.cacheTiles();
                }
            }
        },
        layers: {
            immediate: true,
            deep: true,
            handler(): void {
                const { layers } = this.activeDocument;
                const groups = getAllTileGroupsInDocument( this.activeDocument );

                // newly created document, ensure one tile exists
                if ( groups.length === 0 && layers.length === 1 ) {
                    layers[ 0 ].rel = {
                        type: "tile",
                        id: 0,
                    };
                    groups.push( 0 );
                }
                this.updateGroups( groups );
            }
        },
        activeGroup: {
            immediate: true,
            handler( id: RelId ): void {
                this.setActiveLayerIndex( getIndexOfFirstLayerInTileGroup( this.activeDocument, id ));
            },
        }
    },
    mounted(): void {
        subscribe( "timeline", ( id: RelId, tile: Tile ) => {
            const el = this.$refs[ `thumb_${id}` ] as HTMLCanvasElement[];
            if ( el ) {
                el[ 0 ].width = tile.thumb.width;
                el[ 0 ].height = tile.thumb.height;
                el[ 0 ].getContext( "2d" )!.drawImage( tile.thumb, 0, 0 );
            }
        });
    },
    beforeUnmount(): void {
        unsubscribe( "timeline" );
        flushTileCache();
    },
    methods: {
        ...mapMutations([
            "openModal",
            "setActiveLayerIndex",
            "setActiveGroup",
            "setLoading",
            "updateGroups",
            "unsetLoading",
        ]),
        showContextMenu( event: PointerEvent, tile: string ): void {
            this.contextMenu.show = true;
            this.contextMenu.tile = tile;
            this.contextMenu.x = event.clientX;
            this.contextMenu.y = event.clientY;
        },
        handleAdd(): void {
            addTile( this.$store, this.activeDocument );
        },
        handleClone(): void {
            cloneTile( this.$store, this.activeDocument, this.contextMenu.tile );
        },
        handleDelete(): void {
            deleteTile( this.$store, this.activeDocument, this.contextMenu.tile );
        },
        handlePlay(): void {
            this.openModal( ANIMATION_PREVIEW );
        },
        async cacheTiles(): Promise<void> {
            const groupIds = getAllTileGroupsInDocument( this.activeDocument );
            const smartExec = new SmartExecutor();

            this.setLoading( "tl" );

            for ( const id of groupIds ) {
                await createGroupTile( id, this.activeDocument );
                await smartExec.waitWhenBusy();
            }
            this.unsetLoading( "tl" );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/component";
@use "@/styles/typography";
@use "@/styles/ui";

.timeline {
    @include component.component();

    height: 135px;
    margin-top: 20px;
    box-sizing: border-box;

    &__tiles {
        display: flex;
        gap: variables.$spacing-small;
    }

    &__tile {
        cursor: pointer;
        border: 1px solid colors.$color-lines;
        width: 50px; // see tile-cache THUMB_HEIGHT
        background-color: #FFF;

        &--active {
            border-color: #FFF;
        }
    }
}

.component__content {
    background: colors.$color-window-bg;
    overflow-x: auto;
}

.submenu {
    @include ui.nestedMenu();
}
</style>