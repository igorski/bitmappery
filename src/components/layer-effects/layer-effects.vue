/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2026 - https://www.igorski.nl
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
    <div class="layer-effects" ref="effectsPanel">
        <div class="component__content form" ref="effectsList">
            <div class="wrapper wrapper--toggle">
                <label v-t="'enabled'"></label>
                <toggle-button
                    v-model="internalValue.enabled"
                    name="enabled"
                    sync
                />
            </div>
            <fieldset class="fieldset">
                <legend v-t="'quickAdjustments'" />
                <div class="wrapper wrapper--toggle">
                    <label v-t="'whiteBalance'"></label>
                    <toggle-button
                        v-model="internalValue.quick.whiteBalance"
                        name="invert"
                        sync
                    />
                </div>
                <div class="wrapper wrapper--toggle">
                    <label v-t="'invert'"></label>
                    <toggle-button
                        v-model="internalValue.quick.invert"
                        name="invert"
                        sync
                    />
                </div>
                <div class="wrapper wrapper--toggle">
                    <label v-t="'grayscale'"></label>
                    <toggle-button
                        v-model="internalValue.quick.desaturate"
                        name="desaturate"
                        sync
                    />
                </div>
            </fieldset>
            <fieldset class="fieldset">
                <legend v-t="'colorAdjustments'" />
                <div class="wrapper wrapper--slider">
                    <label v-t="'hue'"></label>
                    <normalised-slider
                        v-model="internalValue.hsl.hue"
                    />
                </div>
                <div class="wrapper wrapper--toggle">
                    <label v-t="'saturation'"></label>
                    <normalised-slider
                        v-model="internalValue.hsl.sat"
                    />
                </div>
                <div class="wrapper wrapper--toggle">
                    <label v-t="'lightness'"></label>
                    <normalised-slider
                        v-model="internalValue.hsl.lightness"
                    />
                </div>
                <div class="wrapper wrapper--slider">
                    <label v-t="'vibrance'"></label>
                    <normalised-slider
                        v-model="internalValue.vibrance"
                    />
                </div>
            </fieldset>
            <fieldset class="fieldset">
                <legend v-t="'toneAdjustments'" />
                <div class="wrapper wrapper--slider">
                    <label v-t="'exposure'"></label>
                    <normalised-slider
                        v-model="internalValue.exposure"
                    />
                </div>
                <div class="wrapper wrapper--slider">
                    <label v-t="'gamma'"></label>
                    <normalised-slider
                        v-model="internalValue.gamma"
                    />
                </div>
                <div class="wrapper wrapper--slider">
                    <label v-t="'brightness'"></label>
                    <normalised-slider
                        v-model="internalValue.brightness"
                    />
                </div>
                <div class="wrapper wrapper--slider">
                    <label v-t="'contrast'"></label>
                    <normalised-slider
                        v-model="internalValue.contrast"
                    />
                </div>
            </fieldset>
            <fieldset class="fieldset fieldset--duotone">
                <legend v-t="'filters'" />
                <div class="wrapper wrapper--toggle">
                    <label
                        for="duotone"
                        v-t="'duotone'"
                    ></label>
                    <toggle-button
                        v-model="internalValue.duotone.enabled"
                        name="duotone"
                        sync
                    />
                </div>
                <div
                    v-if="internalValue.duotone.enabled"
                    class="wrapper wrapper--picker"
                >
                    <div class="shared-inputs">
                        <color-picker
                            id="duotoneColor1"
                            color-type="HEXA"
                            v-model="internalValue.duotone.color1"
                        />
                        <color-picker
                            id="duotoneColor2"
                            color-type="HEXA"
                            v-model="internalValue.duotone.color2"
                        />
                    </div>
                </div>
                <div class="wrapper wrapper--slider">
                    <label v-t="'threshold'"></label>
                    <slider
                        v-model="internalValue.threshold"
                        :min="-1"
                        :max="255"
                        :tooltip="'none'"
                    />
                </div>
                <div class="wrapper wrapper--slider">
                    <label v-t="'blur'"></label>
                    <slider
                        v-model="internalValue.blur"
                        :min="0"
                        :max="maxBlur"
                        :tooltip="'none'"
                    />
                </div>
            </fieldset>
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
import ColorPicker from "@/components/ui/color-picker/color-picker.vue";
import NormalisedSlider from "@/components/ui/slider/normalised-slider.vue";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import Slider from "@/components/ui/slider/slider.vue";
import { MAX_BLUR } from "@/definitions/filter-ranges";
import { Layer } from "@/model/types/layer";
import { type Filters } from "@/model/types/filters";
import FiltersFactory from "@/model/factories/filters-factory";
import { updateLayerFilters } from "@/model/actions/layer-update-filters";
import { clone } from "@/utils/object-util";

import messages from "./messages.json";

export default {
    emits: [ "close" ],
    i18n: { messages },
    components: {
        ColorPicker,
        NormalisedSlider,
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
        this.orgFilters = clone( this.filters );
        this.internalValue = clone( this.filters );
        this.maxBlur = MAX_BLUR;
    },
    mounted(): void {
        const { scrollHeight } = this.$refs.effectsList;
        if ( scrollHeight > this.$refs.effectsPanel.getBoundingClientRect().height ) {
            this.setLayersMaximized( true );
        }
    },
    methods: {
        ...mapMutations([
            "setLayersMaximized",
            "updateLayer",
        ]),
        save(): void {
            const filters = this.internalValue;
            if ( isEqual( filters, this.orgFilters )) {
                return;
            }
            // when filter settings were changed, store these in state history
            const autoApply = false; // these were already applied through update() method
            updateLayerFilters( this.$store, this.activeLayerIndex, this.orgFilters, this.internalValue, autoApply );
            
            // no need to call update(), computed setters have triggered model update
            this.close();
        },
        reset(): void {
            this.internalValue = FiltersFactory.create({
                // these we take from the original state as they
                // are controlled by layer-compositing.vue
                blendMode: this.orgFilters.blendMode,
                opacity: this.orgFilters.opacity,
            });
            this.update();
        },
        cancel( optLayerIndex?: number ): void {
            this.update( this.orgFilters, optLayerIndex );
            this.close();
        },
        close(): void {
            this.setLayersMaximized( false );
            this.$emit( "close" );
        },
        update( optData?: Filters, optLayerIndex?: number ): void {
            const filters = optData || clone( this.internalValue );
            this.updateLayer({
                index: optLayerIndex ?? this.activeLayerIndex,
                opts: { filters }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/panel";

.layer-effects {
    @include panel.panel();
    padding-top: variables.$spacing-small;
    display: flex;
    flex-direction: column;

    :deep(.component__content) {
        @include mixins.boxSize();
        @include mixins.truncate();
        border-bottom: 1px solid colors.$color-lines-dark;
        overflow-x: hidden;
        overflow-y: auto;

        @include mixins.mobile() {
            height: variables.$mobile-layer-panel-height;
        }
    }

    .component__actions {
        margin-top: variables.$spacing-medium;
    }
}

.wrapper--picker .shared-inputs {
    margin-left: 35%;
}

.fieldset--duotone {
    padding-bottom: variables.$spacing-small;

    .shared-inputs {
        justify-content: flex-end;
    }
}
</style>
