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
                :title="$t('add')"
                @click="handleAdd()"
                class="button button--small timeline__button-add"
            >+</button>
            <button
                type="button"
                v-t="'play'"
                :title="$t('previewAnimation')"
                @click="handlePlay()"
                class="button button--small"
            ></button>
        </div>
        <div class="component__content">
            <draggable
                v-model="timelineTiles"
                @change="handleTileDrag"
                class="timeline__tiles"
                itemKey="id"
            >
                <template #item="{element}">
                    <canvas
                        :ref="`thumb_${element}`"
                        class="timeline__tile"
                        @click.stop.prevent="setActiveGroup( element )"
                        @contextmenu.stop.prevent="showContextMenu( $event, element )"
                        :class="{
                            'timeline__tile--active': element === activeGroup
                        }"
                        :width="thumbSize.width"
                        :height="thumbSize.height"
                    >
                    </canvas>
                </template>
            </draggable>
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
import { type Size } from "zcanvas";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import type { Document, RelId } from "@/definitions/document";
import { ANIMATION_PREVIEW } from "@/definitions/modal-windows";
import { scaleToFixedHeight } from "@/math/image-math";
import {
    createGroupTile, flushTileCache, subscribe as subscribeTile, THUMB_HEIGHT, type Tile, unsubscribe as unsubscribeTile
} from "@/rendering/cache/tile-cache";
import { subscribe as subscribeThumbnail, unsubscribe as unsubscribeThumbnail } from "@/rendering/cache/thumbnail-cache";
import { addTile } from "@/store/actions/tile-add";
import { cloneTile } from "@/store/actions/tile-clone";
import { deleteTile } from "@/store/actions/tile-delete";
import { reorderTiles } from "@/store/actions/tile-reorder";
import { getPixelRatio } from "@/utils/canvas-util";
import { SmartExecutor } from "@/utils/debounce-util";
import { getAllTileGroupsInDocument, getIndexOfFirstLayerInTileGroup, getTileByLayer } from "@/utils/timeline-util";
import messages from "./messages.json";

const SUBSCRIPTION_TOKEN = "timeline"; // safe to declare outside of component as only one instance is used
const pending: Map<RelId, Tile> = new Map();
let pendingTimeout: ReturnType<typeof setTimeout>;

export default {
    i18n: { messages },
    components: {
        ContextMenu : defineAsyncComponent({ loader: () => import( "@/components/menus/context-menu/context-menu.vue" ) }),
        Draggable : defineAsyncComponent({ loader: () => import( "vuedraggable" ) }),
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
        thumbSize(): Size {
            return scaleToFixedHeight( this.activeDocument?.width, this.activeDocument?.height, THUMB_HEIGHT * getPixelRatio());
        },
        timelineTiles: {
            get(): RelId[] {
                return this.activeDocument?.groups ?? [];
            },
            set( groups: RelId[] ) {
                reorderTiles( this.$store, this.activeDocument, groups );
            },
        },
    },
    watch: {
        activeDocument: {
            immediate: true,
            handler( activeDocument?: Document ): void {
                flushTileCache();
                if ( activeDocument ) {
                    this.cacheTiles();
                    this.$nextTick(() => this.setActiveGroup( 0 ));
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
        subscribeTile( SUBSCRIPTION_TOKEN, ( id: RelId, tile: Tile ) => {
            if ( !this.renderTile( id, tile )) {
                this.renderTileDebounced( id, tile ); // draggable list likely still mounting (canvas tile not available yet)
            }
        });
        // to manage on-the-fly updates of group tiles, we track changes to layer thumbnails
        // as a convenient signal, with the additional bonus that thumbnail creation is already debounced
        subscribeThumbnail( SUBSCRIPTION_TOKEN, ( layerId: string ) => {
            const tile = getTileByLayer( this.activeDocument, layerId );
            if ( tile !== undefined ) {
                createGroupTile( tile, this.activeDocument );
            }
        });
    },
    beforeUnmount(): void {
        clearTimeout( pendingTimeout );
        pending.clear();
        unsubscribeTile( SUBSCRIPTION_TOKEN );
        unsubscribeThumbnail( SUBSCRIPTION_TOKEN );
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
        handleTileDrag( dragEvent: { moved: { element: RelId, newIndex: number, oldIndex: number }}): void {
            this.setActiveGroup( dragEvent.moved.element );
        },
        renderTile( id: RelId, tile: Tile ): boolean {
            const el = this.$refs[ `thumb_${id}` ] as HTMLCanvasElement;
            if ( !el ) {
                return false;
            }
            el.width = tile.thumb.width;
            el.height = tile.thumb.height;
            el.getContext( "2d" )!.drawImage( tile.thumb, 0, 0 );

            return true;
        },
        renderTileDebounced( id: RelId, tile: Tile ): void {
            pending.set( id, tile );

            clearTimeout( pendingTimeout );
            pendingTimeout = setTimeout(() => {
                for ( const [ id, tile ] of pending.entries() ) {
                    this.renderTile( id, tile );
                }
                pending.clear();
            }, 10 );
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
@use "@/styles/ui";

@include ui.nestedMenu();

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
        border: 2px solid transparent;//colors.$color-lines;
        height: 50px; // see tile-cache THUMB_HEIGHT
        background-color: #FFF;

        &--active {
            border-color: colors.$color-1;
        }
    }

    @include mixins.mobile() {
        position: fixed;
        width: 100%;
        bottom: variables.$heading-height * 2;
    }

    &__button-add {
        position: absolute;
        right: variables.$spacing-medium;
        bottom: variables.$spacing-medium;
        z-index: 1;
    }
}

.component__content {
    background: colors.$color-window-bg;
    overflow-x: auto;
}
</style>