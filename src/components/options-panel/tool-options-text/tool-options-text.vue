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
    <div class="tool-option"
         @focusin="handleFocus"
         @focusout="handleBlur"
    >
        <h3 v-t="'text'"></h3>
        <div class="wrapper input">
            <textarea
                ref="textInput"
                v-model="text"
                class="input-textarea full"
            />
        </div>
        <h3 v-t="'fontProperties'"></h3>
        <div class="wrapper input">
            <vue-select
                v-model="font"
                :options="fonts"
                :searchable="canSearchFonts"
            >
                <template #option="{ value }">
                    <font-preview :font="value" />
                </template>
            </vue-select>
        </div>
        <div class="wrapper input">
            <label v-t="'size'"></label>
            <slider
                v-model="size"
                :min="6"
                :max="172"
                :tooltip="'none'"
            />
        </div>
        <div class="wrapper input">
            <label v-t="'lineHeight'"></label>
            <slider
                v-model="lineHeight"
                :min="0"
                :max="172"
                :tooltip="'none'"
            />
        </div>
        <div class="wrapper input">
            <label v-t="'letterSpacing'"></label>
            <slider
                v-model="spacing"
                :min="0"
                :max="172"
                :tooltip="'none'"
            />
        </div>
        <div class="wrapper input">
            <label v-t="'color'"></label>
            <component
                :is="colorPicker"
                v-model="color"
                v-tooltip="$t('color')"
                class="color-picker"
            />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import VueSelect from "vue-select";
import Slider    from "@/components/ui/slider/slider";
import FontPreview from "./font-preview/font-preview";
import { mapSelectOptions } from "@/utils/search-select-util";
import { enqueueState } from "@/factories/history-state-factory";
import KeyboardService from "@/services/keyboard-service";
import { loadGoogleFont } from "@/services/font-service";
import { googleFonts } from "@/definitions/font-types";
import { isMobile } from "@/utils/environment-util";
import messages  from "./messages.json";

export default {
    i18n: { messages },
    components: {
        FontPreview,
        Slider,
        VueSelect,
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
        canSearchFonts() {
            return !isMobile(); // only show preview list on mobile
        },
        colorPicker() {
            // load async as this adds to the bundle size
            return () => import( "@/components/ui/color-picker/color-picker" );
        },
        fonts() {
            return mapSelectOptions( [ ...googleFonts ].sort() );
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
                this.update({ size }, "size" );
            }
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
                    this.layerId      = layer.id;
                }
            }
        },
    },
    mounted() {
        this.$refs.textInput?.focus();
    },
    destroyed() {
        this.handleBlur();
    },
    methods: {
        ...mapMutations([
            "updateLayer",
        ]),
        handleFocus() {
            KeyboardService.setSuspended( true );
        },
        handleBlur() {
            KeyboardService.setSuspended( false );
        },
        update( textOpts = {}, propName = "text" ) {
            const index = this.activeLayerIndex;
            const store = this.$store;
            const orgOpts = {
                value      : this.text,
                size       : this.size,
                lineHeight : this.lineHeight,
                spacing    : this.spacing,
                font       : this.font,
                color      : this.color,
            };
            const newOpts = {
                ...orgOpts,
                ...textOpts,
            };
            // hold a reference to the original layer rectangle as text updates alter its bounding box
            const { x, y, width, height } = this.activeLayer;
            const commit = () => store.commit( "updateLayer", { index, opts: { text: newOpts } });
            commit();
            enqueueState( `text_${index}`, {
                undo() {
                    store.commit( "updateLayer", { index, opts: { x, y, width, height, text: orgOpts } });
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
@import "@/styles/options-panel";

.color-picker {
    width: 50%;
    display: inline-block;
    transform: translateY(-$spacing-xsmall);
}
</style>
