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
        <div class="timeline__header">
            <button
                type="button"
                v-t="$t('add')"
                @click="handleAdd()"
            ></button>
        </div>
        <div class="timeline__tiles">
            <div
                v-for="tile in activeDocument.groups"
                class="timeline__tile"
                @click.stop.prevent="setActiveGroup( tile )"
                @contextmenu.stop.prevent="showContextMenu( $event, tile )"
                :class="{
                    'timeline__tile--active': tile === activeGroup
                }"
            >
                {{ tile }}
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
                        v-t="$t('clone')"
                        @click.prevent="handleClone()"
                    ></button>
                </li>
                <li>
                    <button
                        type="button"
                        v-t="$t('delete')"
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
import type { Layer, RelId } from "@/definitions/document";
import { addTile } from "@/store/actions/tile-add";
import { cloneTile } from "@/store/actions/tile-clone";
import { deleteTile } from "@/store/actions/tile-delete";
import { getIndexOfFirstLayerInTileGroup } from "@/utils/timeline-util";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    components: {
        ContextMenu : defineAsyncComponent({ loader: () => import( "@/components/menus/context-menu/context-menu.vue" ) }),
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
        layers: {
            immediate: true,
            deep: true,
            handler(): void {
                const { layers } = this.activeDocument;
                const groups: RelId[] = [];
console.info('doc fires',layers.length)
                layers.forEach(( layer: Layer ) => {
                    if ( layer.rel.type === "tile" && !groups.includes( layer.rel.id )) {
                        groups.push( layer.rel.id );
                    }
                });

                // new document
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
                console.info('--- group changed to ' + id)
                this.setActiveLayerIndex( getIndexOfFirstLayerInTileGroup( this.activeDocument, id ));
            },
        }
    },
    methods: {
        ...mapMutations([
            "setActiveLayerIndex",
            "setActiveGroup",
            "updateGroups",
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
    height: 100px;
    background-color: red;
    box-sizing: border-box;
    padding: variables.$spacing-medium;
    align-items: center;
    overflow: hidden;

    &__tiles {
        display: flex;
        gap: variables.$spacing-small;
    }

    &__tile {
        cursor: pointer;
        border: 1px solid colors.$color-lines;
        width: 80px;

        &--active {
            border-color: #FFF;
        }
    }
}

.submenu {
    @include ui.nestedMenu();
}
</style>