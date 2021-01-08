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
    <modal>
        <template #header>
            <h2 v-t="'filters'"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="requestLayerAdd()">
                <div class="wrapper input">
                    <label v-t="'levels'"></label>
                    <slider
                        v-model="levels"
                        :min="0"
                        :max="100"
                        :tooltip="'none'"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'contrast'"></label>
                    <slider
                        v-model="contrast"
                        :min="0"
                        :max="100"
                        :tooltip="'none'"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'desaturate'"></label>
                    <toggle-button
                        v-model="internalValue.desaturate"
                        name="desaturate"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'save'"
                type="button"
                class="button"
                @click="save()"
            ></button>
            <button
                v-t="'reset'"
                type="button"
                class="button"
                @click="reset()"
            ></button>
            <button
                v-t="'cancel'"
                type="button"
                class="button"
                @click="cancel()"
            ></button>
        </template>
    </modal>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import { ToggleButton } from "vue-js-toggle-button";
import Modal  from "@/components/modal/modal";
import Slider from "@/components/ui/slider/slider";
import FiltersFactory from "@/factories/filters-factory";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Modal,
        Slider,
        ToggleButton,
    },
    data: () => ({
        internalValue: {},
    }),
    computed: {
        ...mapGetters([
            "activeLayer",
            "activeLayerIndex",
        ]),
        filters() {
            return this.activeLayer.filters;
        },
        levels: {
            get() {
                return this.internalValue.levels * 100;
            },
            set( value ) {
                this.internalValue.levels = value / 100;
            }
        },
        contrast: {
            get() {
                return this.internalValue.contrast * 100;
            },
            set( value ) {
                this.internalValue.contrast = value / 100;
            }
        },
    },
    watch: {
        internalValue: {
            deep: true,
            handler( value ) {
                // debounce the model update (and subsequent filter render)
                // to not update directly after each change event
                if ( this.renderPending ) {
                    return;
                }
                this.renderPending = true;
                window.setTimeout(() => {
                    this.renderPending = false;
                    this.update();
                }, 250 );
            },
        }
    },
    created() {
        this.orgFilters    = { ...this.filters };
        this.internalValue = { ...this.filters };
    },
    methods: {
        ...mapMutations([
            "updateLayer",
            "closeModal",
        ]),
        save() {
            this.update();
            this.closeModal();
        },
        reset() {
            this.internalValue = FiltersFactory.create();
            this.update();
        },
        cancel() {
            this.update( this.orgFilters );
            this.closeModal();
        },
        update( optData ) {
            const filters = optData || { ...this.internalValue };
            this.updateLayer({
                index: this.activeLayerIndex,
                opts: { filters }
            });
        }
    },
};
</script>
