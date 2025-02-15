/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2024 - https://www.igorski.nl
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
            <div class="wrapper input">
                <label v-t="'blendMode'"></label>
                <select-box
                    v-model="internalValue.blendMode"
                    :options="blendModes"
                    :disabled="activeLayerIndex === 0"
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
                <label v-t="'threshold'"></label>
                <slider
                    v-model="threshold"
                    :min="-1"
                    :max="255"
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

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import isEqual from "lodash.isequal";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import Slider from "@/components/ui/slider/slider.vue";
import { Layer, Filters } from "@/definitions/document";
import { BlendModes } from "@/definitions/blend-modes";
import FiltersFactory from "@/factories/filters-factory";
import { enqueueState } from "@/factories/history-state-factory";
import KeyboardService from "@/services/keyboard-service";
import messages from "./messages.json";

export default {
    emits: [ "close" ],
    i18n: { messages },
    components: {
        SelectBox,
        Slider,
        ToggleButton,
    },
    data: () => ({
        internalValue: {} as Partial<Filters>,
    }),
    computed: {
        ...mapGetters([
            "activeLayer",
            "activeLayerIndex",
        ]),
        filters(): Filters {
            return this.activeLayer.filters;
        },
        blendModes(): any {
            return [
                { label: this.$t( "normal" ), value: BlendModes.NORMAL },
                { label: this.$t( "darken" ), value: BlendModes.DARKEN },
                { label: this.$t( "multiply" ), value: BlendModes.MULTIPLY },
                { label: this.$t( "colorBurn" ), value: BlendModes.COLOR_BURN },
                { label: this.$t( "darkerColor" ), value: BlendModes.DARKER_COLOR },
                { label: this.$t( "lighten" ), value: BlendModes.LIGHTEN },
                { label: this.$t( "screen" ), value: BlendModes.SCREEN },
                { label: this.$t( "colorDodge" ), value: BlendModes.COLOR_DODGE },
                { label: this.$t( "linearDodgeAdd" ), value: BlendModes.LINEAR_DODGE },
                { label: this.$t( "lighterColor" ), value: BlendModes.LIGHTER_COLOR },
                { label: this.$t( "overlay" ), value: BlendModes.OVERLAY },
                { label: this.$t( "softLight" ), value: BlendModes.SOFT_LIGHT },
                { label: this.$t( "hardLight" ), value: BlendModes.HARD_LIGHT },
                { label: this.$t( "difference" ), value: BlendModes.DIFFERENCE },
                { label: this.$t( "exclusion" ), value: BlendModes.EXCLUSION },
                { label: this.$t( "hue" ), value: BlendModes.HUE },
                { label: this.$t( "saturation" ), value: BlendModes.SATURATION },
                { label: this.$t( "color" ), value: BlendModes.COLOR },
                { label: this.$t( "luminosity" ), value: BlendModes.LUMINOSITY },
            ];
        },
        blendMode: {
            get(): BlendModes {
                return this.internalValue.blendMode;
            },
            set( value: BlendModes ): void {
                this.internalValue.blendMode = value;
            }
        },
        opacity: {
            get(): number {
                return this.internalValue.opacity * 100;
            },
            set( value: number ): void {
                this.internalValue.opacity = value / 100;
            }
        },
        gamma: {
            get(): number {
                return this.internalValue.gamma * 100;
            },
            set( value: number ): void {
                this.internalValue.gamma = value / 100;
            }
        },
        brightness: {
            get(): number {
                return this.internalValue.brightness * 100;
            },
            set( value: number ): void {
                this.internalValue.brightness = value / 100;
            }
        },
        contrast: {
            get(): number {
                return this.internalValue.contrast * 100;
            },
            set( value: number ): void {
                this.internalValue.contrast = value / 100;
            }
        },
        vibrance: {
            get(): number {
                return this.internalValue.vibrance * 100;
            },
            set( value: number ): void {
                this.internalValue.vibrance = value / 100;
            }
        },
        threshold: {
            get(): number {
                return this.internalValue.threshold;
            },
            set( value: number ): void {
                this.internalValue.threshold = value;
            }
        },
    },
    watch: {
        internalValue: {
            deep: true,
            handler(): void {
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
        activeLayer( value?: Layer, oldValue?: Layer ): void {
            if ( !value ) {
                this.close(); // document has been closed
            } else if ( oldValue && value.id !== oldValue.id ) {
                this.cancel( this.orgLayerId ); // layer has switched
            } else {
                this.optLayerIndex = this.activeLayerIndex;
            }
        }
    },
    created(): void {
        this.orgFilters    = { ...this.filters };
        this.internalValue = { ...this.filters };
        KeyboardService.setListener( this.handleKeyUp.bind( this ), false );
    },
    beforeUnmount(): void {
        KeyboardService.setListener( null );
    },
    methods: {
        ...mapMutations([
            "updateLayer",
            "closeModal",
        ]),
        handleKeyUp( type: string, keyCode: number ): void {
            if ( keyCode === 27 ) {
                this.cancel();
            }
        },
        save(): void {
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
        reset(): void {
            this.internalValue = FiltersFactory.create();
            this.update();
        },
        cancel( optLayerIndex?: number ): void {
            this.update( this.orgFilters, optLayerIndex );
            this.close();
        },
        close(): void {
            this.$emit( "close" );
        },
        update( optData?: Filters, optLayerIndex?: number ): void {
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
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/panel";

.layer-filters {
    @include panel.panel();

    & {
        display: flex;
        flex-direction: column;

        .component__content {
            padding: variables.$spacing-small 0;
            @include mixins.boxSize();
            @include mixins.truncate();
            border-bottom: 1px solid colors.$color-lines;
        }

        .component__actions {
            margin-top: variables.$spacing-medium;
        }
    }
}
</style>
