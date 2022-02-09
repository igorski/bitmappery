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
    <div class="layer-filters">
        <div class="component__content form">
            <div class="wrapper input">
                <label v-t="'enabled'"></label>
                <toggle-button
                    v-model="internalValue.enabled"
                    name="enabled"
                    sync
                />
            </div>
            <div class="wrapper slider">
                <label v-t="'opacity'"></label>
                <slider
                    v-model="opacity"
                    :min="0"
                    :max="100"
                    :tooltip="'none'"
                />
            </div>
            <div class="wrapper slider">
                <label v-t="'gamma'"></label>
                <slider
                    v-model="gamma"
                    :min="0"
                    :max="100"
                    :tooltip="'none'"
                />
            </div>
            <div class="wrapper slider">
                <label v-t="'brightness'"></label>
                <slider
                    v-model="brightness"
                    :min="0"
                    :max="100"
                    :tooltip="'none'"
                />
            </div>
            <div class="wrapper slider">
                <label v-t="'contrast'"></label>
                <slider
                    v-model="contrast"
                    :min="0"
                    :max="100"
                    :tooltip="'none'"
                />
            </div>
            <div class="wrapper slider">
                <label v-t="'vibrance'"></label>
                <slider
                    v-model="vibrance"
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
                    sync
                />
            </div>
        </div>
        <div class="component__actions">
            <button
                v-t="'reset'"
                type="button"
                class="button button--small"
                @click="reset()"
            ></button>
            <button
                v-t="'cancel'"
                type="button"
                class="button button--small"
                @click="cancel()"
            ></button>
            <button
                v-t="'save'"
                type="button"
                class="button button--small"
                @click="save()"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import isEqual from "lodash.isequal";
import { ToggleButton } from "vue-js-toggle-button";
import Slider from "@/components/ui/slider/slider";
import FiltersFactory from "@/factories/filters-factory";
import { enqueueState } from "@/factories/history-state-factory";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
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
        opacity: {
            get() {
                return this.internalValue.opacity * 100;
            },
            set( value ) {
                this.internalValue.opacity = value / 100;
            }
        },
        gamma: {
            get() {
                return this.internalValue.gamma * 100;
            },
            set( value ) {
                this.internalValue.gamma = value / 100;
            }
        },
        brightness: {
            get() {
                return this.internalValue.brightness * 100;
            },
            set( value ) {
                this.internalValue.brightness = value / 100;
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
        vibrance: {
            get() {
                return this.internalValue.vibrance * 100;
            },
            set( value ) {
                this.internalValue.vibrance = value / 100;
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
        },
        activeLayer( value, oldValue ) {
            if ( !value ) {
                this.close(); // document has been closed
            } else if ( oldValue && value.id !== oldValue.id ) {
                this.cancel( this.orgLayerId ); // layer has switched
            } else {
                this.optLayerIndex = this.activeLayerIndex;
            }
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
            // if filter settings were changed, store these in state history
            const store      = this.$store;
            const index      = this.activeLayerIndex;
            const orgFilters = this.orgFilters;
            const filters    = this.internalValue;
            if ( !isEqual( filters, orgFilters )) {
                enqueueState( `filters_${this.activeLayer.id}`, {
                    undo() {
                        store.commit( "updateLayer", { index, opts: { filters: orgFilters } });
                    },
                    redo() {
                        store.commit( "updateLayer", { index, opts: { filters }});
                    },
                });
            }
            // no need to call update(), computed setters have triggered model update
            this.close();
        },
        reset() {
            this.internalValue = FiltersFactory.create();
            this.update();
        },
        cancel( optLayerIndex ) {
            this.update( this.orgFilters, optLayerIndex );
            this.close();
        },
        close() {
            this.$emit( "close" );
        },
        update( optData, optLayerIndex ) {
            const filters = optData || { ...this.internalValue };
            this.updateLayer({
                index: optLayerIndex ?? this.activeLayerIndex,
                opts: { filters }
            });
        }
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/panel";
@import "@/styles/_mixins";

.layer-filters {
    @include panel();
    display: flex;
    flex-direction: column;
}

.component__content {
    padding: $spacing-small 0;
    @include boxSize();
    @include truncate();
    border-bottom: 1px solid $color-lines;
}

.component__actions {
    margin-top: $spacing-medium;
}
</style>
