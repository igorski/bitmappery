/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
    <div
        class="tool-option"
        @focusin="handleFocus"
        @focusout="handleBlur"
    >
        <div class="wrapper input">
            <textarea
                ref="textInput"
                v-model="text"
                :placeholder="$t('typeYourTextHere')"
                :disabled="disabled"
                class="input-textarea full"
            />
        </div>
        <h3 v-t="'fontProperties'"></h3>
        <div class="wrapper input">
            <vue-select
                v-model="font"
                :options="fonts"
                :searchable="canSearchFonts"
                :disabled="disabled"
                append-to-body
            >
                <template #option="{ value }">
                    <font-preview :font="value" />
                </template>
            </vue-select>
        </div>
        <div class="wrapper slider">
            <label v-t="'size'"></label>
            <input
                v-model="size"
                class="input-field half"
                type="number"
                :disabled="disabled"
            />
            <select-box
                v-model="unit"
                :options="unitOptions"
                class="half"
                :disabled="disabled"
            />
        </div>
        <div class="wrapper slider">
            <label v-t="'lineHeight'"></label>
            <slider
                v-model="lineHeight"
                :min="0"
                :max="172"
                :disabled="disabled"
                :tooltip="'none'"
            />
        </div>
        <div class="wrapper slider">
            <label v-t="'letterSpacing'"></label>
            <slider
                v-model="spacing"
                :min="0"
                :max="172"
                :disabled="disabled"
                :tooltip="'none'"
            />
        </div>
        <div class="wrapper input">
            <label v-t="'color'"></label>
            <component
                :is="colorPicker"
                v-model="color"
                v-tooltip="$t('color')"
                :disabled="disabled"
                class="color-picker"
            />
        </div>
    </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import { mapGetters, mapMutations } from "vuex";
import VueSelect from "vue-select";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import Slider from "@/components/ui/slider/slider.vue";
import { DEFAULT_LAYER_NAME, LayerTypes } from "@/definitions/layer-types";
import FontPreview from "./font-preview/font-preview.vue";
import { mapSelectOptions } from "@/utils/search-select-util";
import { enqueueState } from "@/factories/history-state-factory";
import KeyboardService from "@/services/keyboard-service";
import { fontsConsented, consentFonts, rejectFonts } from "@/services/font-service";
import { googleFonts } from "@/definitions/font-types";
import { isMobile } from "@/utils/environment-util";
import { focus } from "@/utils/environment-util";
import { truncate } from "@/utils/string-util";
import messages from "./messages.json";
import sharedMessages from "@/messages.json";

export default {
    i18n: { messages, sharedMessages },
    components: {
        FontPreview,
        Slider,
        VueSelect,
        SelectBox,
    },
    data: () => ({
        internalText: "",
        renderPending: false,
        layerId: null,
    }),
    computed: {
        ...mapGetters([
            "activeLayerIndex",
            "activeLayer",
        ]),
        disabled() {
            return this.activeLayer?.type !== LayerTypes.LAYER_TEXT;
        },
        canSearchFonts() {
            return !isMobile(); // only show preview list on mobile
        },
        colorPicker() {
            // load async as this adds to the bundle size
            return defineAsyncComponent({
                loader: () => import( "@/components/ui/color-picker/color-picker.vue" )
            });
        },
        fonts() {
            return mapSelectOptions( [ ...googleFonts ].sort() );
        },
        unitOptions() {
            return [
                { label: this.$t( "pixels" ), value: "px" },
                { label: this.$t( "points" ), value: "pt" },
                { label: this.$t( "millis" ), value: "mm" },
                { label: this.$t( "centis" ), value: "cm" },
            ];
        },
        text: {
            get() {
                return this.internalText;
            },
            set( value ) {
                this.internalText = value;
                // debounce the model update (and subsequent text render)
                // to not update on each entered character
                if ( this.renderPending ) {
                    return;
                }
                this.renderPending = true;
                window.setTimeout(() => {
                    this.renderPending = false;
                    this.update( null, `value_${this.text}` );
                }, 50 );
            }
        },
        size: {
            get() {
                return this.activeLayer?.text?.size;
            },
            set( size ) {
                size = parseFloat( size );
                if ( isNaN( size )) {
                    return;
                }
                size = Math.max( 1, Math.min( 999, size ));
                this.update({ size }, "size" );
            }
        },
        unit: {
            get() {
                return this.activeLayer?.text?.unit;
            },
            set( unit ) {
                this.update({ unit }, "unit" );
            },
        },
        lineHeight: {
            get() {
                return this.activeLayer?.text?.lineHeight;
            },
            set( lineHeight ) {
                this.update({ lineHeight }, "lineHeight" );
            }
        },
        spacing: {
            get() {
                return this.activeLayer?.text?.spacing;
            },
            set( spacing ) {
                this.update({ spacing }, "spacing" );
            }
        },
        color: {
            get() {
                return this.activeLayer?.text?.color;
            },
            set( color ) {
                this.update({ color }, "color" );
            }
        },
        font: {
            get() {
                return this.activeLayer?.text?.font;
            },
            set({ value } ) {
                this.update({ font: value }, "font" );
            }
        }
    },
    watch: {
        activeLayer: {
            immediate: true,
            handler( layer ) {
                if ( layer && this.layerId !== layer.id ) {
                    this.internalText = layer.text?.value;
                    this.syncText     = this.internalText === layer.name || layer.name === DEFAULT_LAYER_NAME;
                    this.layerId      = layer.id;
                }
            }
        },
    },
    mounted() {
        if ( !fontsConsented() ) {
            this.openDialog({
                type: "confirm",
                title: this.$t( "fonts.consentRequired" ),
                message: this.$t( "fonts.consentExpl" ),
                confirm: () => {
                    consentFonts();
                },
                cancel: () => {
                    rejectFonts();
                    this.setActiveTool({ tool: null });
                }
            });
        } else {
            focus( this.$refs.textInput );
        }
    },
    unmounted() {
        this.handleBlur();
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "setActiveTool",
            "updateLayer",
        ]),
        handleFocus() {
            KeyboardService.setSuspended( true );
        },
        handleBlur() {
            KeyboardService.setSuspended( false );
        },
        update( textOpts = {}, propName = "text" ) {
            if ( !this.activeLayer ) {
                return;
            }
            const index = this.activeLayerIndex;
            const store = this.$store;
            const orgOpts = {
                value      : this.text,
                size       : this.size,
                unit       : this.unit,
                lineHeight : this.lineHeight,
                spacing    : this.spacing,
                font       : this.font,
                color      : this.color,
            };
            const newOpts = {
                ...orgOpts,
                ...textOpts,
            };
            const orgName = this.activeLayer.name;
            let newName   = orgName;
            // when active layer uses the default layer name or is synced to
            // the text content, keep the layer name in sync with the text
            if ( orgName === DEFAULT_LAYER_NAME || this.syncText ) {
                newName = truncate( this.internalText || DEFAULT_LAYER_NAME, 64 );
            }
            // hold a reference to the original layer rectangle as text updates alter its bounding box
            const { left, top, width, height } = this.activeLayer;
            const commit = () => store.commit( "updateLayer", { index, opts: { name: newName, text: newOpts } });
            commit();
            enqueueState( `${propName}_${index}`, {
                undo() {
                    store.commit( "updateLayer", { index, opts: { left, top, width, height, name: orgName, text: orgOpts } });
                },
                redo() {
                    commit();
                },
            });
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_variables";
@use "@/styles/tool-option";

.color-picker {
    width: 50%;
    display: inline-block;
    transform: translateY(-(variables.$spacing-xsmall));
}

.half {
    width: 75px !important;
    margin-right: variables.$spacing-small;
}
</style>
