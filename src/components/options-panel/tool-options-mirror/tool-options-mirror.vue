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
    <div class="tool-option">
        <h3 v-t="'mirror'"></h3>
        <div class="actions">
            <button
                v-t="'flipHorizontal'"
                type="button"
                class="button button--small"
                @click="flipHorizontal"
            ></button>
            <button
                v-t="'flipVertical'"
                type="button"
                class="button button--small"
                @click="flipVertical"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapGetters } from "vuex";
import { enqueueState } from "@/factories/history-state-factory";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapGetters([
            "activeLayerIndex",
            "activeLayerEffects",
        ]),
    },
    methods: {
        flipHorizontal() {
            this.update({ mirrorX: !this.activeLayerEffects.mirrorX }, "mirrorX" );
        },
        flipVertical() {
            this.update({ mirrorY: !this.activeLayerEffects.mirrorY }, "mirrorY" );
        },
        update( effect, propName = "mirror" ) {
            const { mirrorX, mirrorY } = this.activeLayerEffects;
            const newEffects = {
                mirrorX,
                mirrorY,
                ...effect,
            };
            const index  = this.activeLayerIndex;
            const store  = this.$store;
            const commit = () => store.commit( "updateLayerEffects", { index, effects: newEffects });
            commit();
            enqueueState( propName, {
                undo() {
                    store.commit( "updateLayerEffects", { index, effects: { mirrorX, mirrorY } });
                },
                redo() {
                    commit();
                },
            });
        }
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/options-panel";
</style>
