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
    <fieldset class="layer-compositing">
        <!-- <legend v-t="'compositing'" /> -->
        <div class="layer-compositing--blend-mode">
            <select-box
                v-model="blendMode"
                v-tooltip.top="$t('blendMode')"
                :options="blendModes"
                :disabled="!canBlend"
                class="blend-select"
            />
        </div>
        <div class="layer-compositing--opacity">
            <slider
                v-model="opacity"
                v-tooltip.top="$t('opacity')"
                :min="0"
                :max="100"
                :tooltip="'none'"
                :disabled="!activeLayer"
                :large="false"
            />
        </div>
    </fieldset>
</template>

<script lang="ts">
import { mapGetters } from "vuex";
import { BlendModes } from "@/definitions/blend-modes";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import Slider from "@/components/ui/slider/slider.vue";
import { updateLayerFilters } from "@/model/actions/layer-update-filters";
import FiltersFactory from "@/model/factories/filters-factory";
import { type Filters } from "@/model/types/filters";
import { clone } from "@/utils/object-util";
import { getIndexOfFirstLayerInTileGroup } from "@/utils/timeline-util";
import messages from "./messages.json";

type IPendingUpdate = {
    pending: boolean;
    layerIndex: number;
    prop?: keyof Filters;
    value?: any;
    orgValue?: any;
    timeout?: ReturnType<typeof setTimeout>;
}
const pendingUpdate: IPendingUpdate = {
    pending: false,
    layerIndex: -1,
};

const HIDDEN_MODES = [ BlendModes.LIGHTER_COLOR, BlendModes.DARKER_COLOR ];
const UPDATE_DELAY = 250;

export default {
    i18n: { messages },
    components: {
        SelectBox,
        Slider,
    },
    data: () => ({
        internalValue: {} as Partial<Filters>,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "activeGroup",
            "activeLayer",
            "activeLayerIndex",
        ]),
        filters(): Filters {
            return this.activeLayer?.filters ?? FiltersFactory.create();
        },
        blendModes(): { label: string, value: BlendModes }[] {
            const modes = [
                { label: this.$t( "normal" ), value: BlendModes.NORMAL },
                { label: this.$t( "darken" ), value: BlendModes.DARKEN },
                { label: this.$t( "multiply" ), value: BlendModes.MULTIPLY },
                { label: this.$t( "colorBurn" ), value: BlendModes.COLOR_BURN },
                { label: this.$t( "darkerColor" ), value: BlendModes.DARKER_COLOR },
                { label: this.$t( "lighten" ), value: BlendModes.LIGHTEN },
                { label: this.$t( "screen" ), value: BlendModes.SCREEN },
                { label: this.$t( "colorDodge" ), value: BlendModes.COLOR_DODGE },
                { label: this.$t( "linearDodge" ), value: BlendModes.LINEAR_DODGE },
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
            // only show lighter color and darker color modes when already set (e.g. from import) as these aren't too performant.
            if ( HIDDEN_MODES.includes( this.blendMode )) {
                return modes;
            }
            return modes.filter(({ value }) => !HIDDEN_MODES.includes( value ));
        },
        hasTimeline(): boolean {
            return this.activeDocument?.type === "timeline"
        },
        canBlend(): boolean {
            if ( !this.hasTimeline ) {
                return this.activeLayer && this.activeLayerIndex > 0;
            }
            return this.activeLayerIndex > getIndexOfFirstLayerInTileGroup( this.activeDocument, this.activeGroup );
        },
        opacity: {
            get(): number {
                return this.filters.opacity * 100;
            },
            set( value: number ): void {
                const scaledValue = value / 100;
                this.update( "opacity", scaledValue );
                // by mutating the reactive filter prop directly we can instantly see the result
                // though we should call update() first to properly track state history
                this.filters.opacity = scaledValue;
            },
        },
        blendMode: {
            get(): BlendModes {
                return this.filters?.blendMode ?? BlendModes.NORMAL;
            },
            set( value: BlendModes ) {
                this.update( "blendMode", value );
                // by mutating the reactive filter prop directly we can instantly see the result
                // though we should call update() first to properly track state history
                this.filters.blendMode = value;
            },
        },
    },
    methods: {
        update( prop: keyof Filters, value: any ): void {
            if ( pendingUpdate.pending ) {
                clearTimeout( pendingUpdate.timeout );
                if ( prop !== pendingUpdate.prop ) {
                    this.storeChanges();
                }
            }
            if ( !pendingUpdate.pending ) {
                pendingUpdate.orgValue = this.filters[ prop ];
            }
            pendingUpdate.layerIndex = this.activeLayerIndex;
            pendingUpdate.prop = prop;
            pendingUpdate.value = value;
            
            pendingUpdate.timeout = setTimeout(() => {
                this.storeChanges();
            }, UPDATE_DELAY );

            pendingUpdate.pending = true;
        },
        storeChanges(): void {
            pendingUpdate.pending = false;
            
            if ( !this.activeDocument || pendingUpdate.layerIndex === -1 ) {
                return;
            }
            const propName = pendingUpdate.prop as string;
            const orgFilters = {
                ...clone( this.activeDocument.layers[ pendingUpdate.layerIndex ].filters ),
                [ propName ]: pendingUpdate.orgValue,
            };
            const filters = {
                ...orgFilters,
                [ propName ]: pendingUpdate.value,
            };
            updateLayerFilters( this.$store, pendingUpdate.layerIndex, orgFilters, filters, true, propName );
        }
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_variables";

.layer-compositing {
    display: flex;
    justify-content: space-between;
    gap: variables.$spacing-small;
    border: none;
    margin: 0;
    padding: variables.$spacing-small #{variables.$spacing-medium - variables.$spacing-xsmall};
    border-bottom: 1px solid colors.$color-lines-dark;

    &--blend-mode {
        flex: 0.5;

        .blend-select {
            width: 100%;
        }
    }

    &--opacity {
        flex: 0.5;
        outline: 1px solid colors.$color-lines-dark;
        outline-offset: -1px;
        border-radius: variables.$spacing-small;
        
        .input-slider {
            padding: 0 variables.$spacing-small;
        }
    }
}
</style>
