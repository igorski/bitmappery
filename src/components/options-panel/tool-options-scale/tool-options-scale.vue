/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
        <h3 v-t="'scale'"></h3>
        <div class="wrapper full slider">
            <slider
                v-model="scale"
                :min="min"
                :max="max"
                :tooltip="'none'"
            />
        </div>
        <div class="actions">
            <button
                v-t="'reset'"
                type="button"
                class="button button--small"
                @click="reset()"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapGetters } from "vuex";
import ToolTypes, { MIN_ZOOM, MAX_ZOOM } from "@/definitions/tool-types";
import Slider    from "@/components/ui/slider/slider";
import { enqueueState } from "@/factories/history-state-factory";
import { scale } from "@/math/unit-math";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Slider,
    },
    data: () => ({
        min: MIN_ZOOM,
        max: MAX_ZOOM,
    }),
    computed: {
        ...mapGetters([
            "activeLayerIndex",
            "activeLayerEffects",
        ]),
        scale: {
            get() {
                return ( this.activeLayerEffects.scale - 1 ) * MAX_ZOOM;
            },
            set( value ) {
                this.update( scale( value, MAX_ZOOM, 1 ) + 1 );
            }
        }
    },
    methods: {
        update( scale ) {
            const oldScale = this.activeLayerEffects.scale;
            const index  = this.activeLayerIndex;
            const store  = this.$store;
            const commit = () => {
                store.commit( "updateLayerEffects", { index, effects: { scale } });
            };
            commit();
            enqueueState( `scale_${index}`, {
                undo() {
                    store.commit( "updateLayerEffects", { index, effects: { scale: oldScale } });
                },
                redo() {
                    commit();
                },
            });
        },
        reset() {
            this.scale = 0;
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/options-panel";
</style>
