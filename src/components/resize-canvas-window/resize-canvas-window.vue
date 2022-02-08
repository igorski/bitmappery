/**
* The MIT License (MIT)
*
* Igor Zinken 2021-2022 - https://www.igorski.nl
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
    <modal class="resize-canvas">
        <template #header>
            <h2 v-t="'resizeCanvas'" class="component__title"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="resize()">
                <div class="wrapper input">
                    <label v-t="'width'"></label>
                    <input
                        v-model.number="width"
                        ref="widthInput"
                        type="number"
                        name="width"
                        class="input-field"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'height'"></label>
                    <input
                        v-model.number="height"
                        type="number"
                        name="height"
                        class="input-field"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'contentAlignment'"></label>
                    <select-box :options="alignmentOptions"
                                 v-model="alignment"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'resize'"
                type="button"
                class="button"
                @click="resize()"
            ></button>
            <button
                v-t="'cancel'"
                type="button"
                class="button"
                @click="closeModal()"
            ></button>
        </template>
    </modal>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import { enqueueState } from "@/factories/history-state-factory";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import { focus } from "@/utils/environment-util";
import Modal from "@/components/modal/modal";
import SelectBox  from '@/components/ui/select-box/select-box';
import messages from "./messages.json";

const TOP_LEFT      = "TL";
const TOP_CENTER    = "TC";
const TOP_RIGHT     = "TR";
const CENTER_LEFT   = "CL";
const CENTER        = "C";
const CENTER_RIGHT  = "CR";
const BOTTOM_LEFT   = "BL";
const BOTTOM_CENTER = "BC";
const BOTTOM_RIGHT  = "BR";

export default {
    i18n: { messages },
    components: {
        Modal,
        SelectBox,
    },
    data: () => ({
        width: 0,
        height: 0,
        alignment: CENTER,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
        alignmentOptions() {
            return [
                { label: this.$t( "topLeft" ),      value: TOP_LEFT },
                { label: this.$t( "topCenter" ),    value: TOP_CENTER },
                { label: this.$t( "topRight" ),     value: TOP_RIGHT },
                { label: this.$t( "centerLeft" ),   value: CENTER_LEFT },
                { label: this.$t( "centered" ),     value: CENTER },
                { label: this.$t( "centerRight" ),  value: CENTER_RIGHT },
                { label: this.$t( "bottomLeft" ),   value: BOTTOM_LEFT },
                { label: this.$t( "bottomCenter" ), value: BOTTOM_CENTER },
                { label: this.$t( "bottomRight" ),  value: BOTTOM_RIGHT }
            ];
        },
    },
    mounted() {
        this.width  = this.activeDocument.width;
        this.height = this.activeDocument.height;
        focus( this.$refs.widthInput );
    },
    methods: {
        ...mapMutations([
            "closeModal"
        ]),
        resize() {
            const store = this.$store;
            const { activeDocument, width, height, alignment } = this;
            const orgDocWidth  = activeDocument.width;
            const orgDocHeight = activeDocument.height;

            // left alignments : TOP_LEFT, CENTER_LEFT, BOTTOM_LEFT
            // top alignments  : TOP_LEFT, TOP_CENTER, TOP_RIGHT
            let deltaX = 0, deltaY = 0;

            // horizontally center aligned
            if ([ TOP_CENTER, CENTER, BOTTOM_CENTER ].includes( alignment )) {
                deltaX = ( width - orgDocWidth ) / 2;
            }
            // horizontally right aligned
            if ([ TOP_RIGHT, CENTER_RIGHT, BOTTOM_RIGHT ].includes( alignment )) {
                deltaX = width - orgDocWidth;
            }
            // vertically center aligned
            if ([ CENTER_LEFT, CENTER, CENTER_RIGHT ].includes( alignment )) {
                deltaY = ( height - orgDocHeight ) / 2;
            }
            // vertically bottom aligned
            if ([ BOTTOM_LEFT, BOTTOM_CENTER, BOTTOM_RIGHT ].includes( alignment )) {
                deltaY = height - orgDocHeight;
            }

            // store original and calculate new offsets for each Layer
            const orgLayerOffsets = [];
            const newLayerOffsets = [];
            activeDocument.layers.forEach(({ id, x, y }) => {
                orgLayerOffsets.push({ id, x, y });
                newLayerOffsets.push({ id, x: x + deltaX, y: deltaY });
            });
            const updateOffsets = ( layers, offsetList ) => {
                layers.forEach( layer => {
                    const { x, y } = offsetList.find(({ id }) => layer.id );
                    layer.x = x;
                    layer.y = y;
                });
            };
            const commit = () => {
                updateOffsets( activeDocument.layers, newLayerOffsets );
                activeDocument.layers.forEach( layer => {
                    const sprite = getSpriteForLayer( layer );
                    if ( sprite ) {
                        sprite._bounds.left += deltaX;
                        sprite._bounds.top  += deltaY;
                    }
                });
                store.commit( "setActiveDocumentSize", { width, height });
            };
            commit();
            enqueueState( "resizeCanvas", {
                undo() {
                    updateOffsets( activeDocument.layers, orgLayerOffsets );
                    activeDocument.layers.forEach( layer => {
                        const sprite = getSpriteForLayer( layer );
                        if ( sprite ) {
                            sprite._bounds.left -= deltaX;
                            sprite._bounds.top  -= deltaY;
                        }
                    });
                    store.commit( "setActiveDocumentSize", { width: orgDocWidth, height: orgDocHeight });
                },
                redo: commit,
            });
            this.closeModal();
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/ui";

.resize-canvas {
    @include modalBase( 480px, 220px );
}
</style>
