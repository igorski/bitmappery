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
    <div>
        <h3 v-t="'dimensions'" class="title"></h3>
        <div class="wrapper wrapper--select">
            <label v-t="'unit'"></label>
            <div class="select-combo">
                <select-box
                    :options="units"
                    v-model="internalValue.unit"
                    class="first"
                />
                <select-box
                    v-model.number="dpi"
                    :options="dpis"
                    :disabled="!showDPI"
                />
            </div>
        </div>
        <div class="wrapper wrapper--input wrapper--small">
            <label v-t="'width'"></label>
            <input
                v-model.number="translatedWidth"
                type="number"
                name="width"
                min="1"
                max="9999"
                class="input-field"
            />
        </div>
        <div class="wrapper wrapper--input wrapper--small">
            <label v-t="'height'"></label>
            <input
                v-model.number="translatedHeight"
                type="number"
                name="height"
                min="1"
                max="9999"
                class="input-field"
            />
        </div>
    </div>
</template>

<script lang="ts">
import SelectBox from "@/components/ui/select-box/select-box.vue";
import { DEFAULT_DPI, DEFAULT_UNIT, DPI, UNITS } from "@/definitions/document-presets";
import { pixelsToInch, pixelsToCm, pixelsToMm, inchesToPixels, cmToPixels, mmToPixels,  } from "@/math/unit-math";
import messages from "./messages.json";

const toFixedFloat = ( value: number, exp = 2 ): number => parseFloat( value.toFixed( exp ));

export default {
    emits: [ "update:modelValue" ],
    i18n: { messages },
    components: {
        SelectBox,
    },
    props: {
        modelValue: {
            type: Object,
            required: true,
            validator: ({ width, height, dpi, unit }) => {
                return typeof width === "number" && typeof height === "number" && ( dpi === undefined || typeof dpi === "number" ) && typeof unit === "string";
            }
        },
    },
    data: () => ({
        internalValue: {
            width: 1,
            height: 1,
            dpi: DEFAULT_DPI,
            unit: DEFAULT_UNIT,
        },
    }),
    computed: {
        showDPI(): boolean {
            return this.internalValue.unit !== "px";
        },
        dpis(): { label: string, value: number }[] {
            return DPI.map( dpi => ({ label: `${dpi} DPI`, value: dpi }));
        },
        units(): { label: string, value: string }[] {
            return UNITS.map( unit => ({ label: this.$t( unit ), value: unit }));
        },
        translatedWidth: {
            get(): number {
                return this.valueFromPx( this.internalValue.width );
            },
            set( value: number ): void {
                this.internalValue.width = this.valueToPx( value );
            },
        },
        translatedHeight: {
            get(): number {
                return this.valueFromPx( this.internalValue.height );
            },
            set( value: number ): void {
                this.internalValue.height = this.valueToPx( value )
            },
        },
        dpi: {
            get(): number {
                return this.internalValue.dpi;
            },
            set( value: number ): void {
                const oldValue = this.internalValue.dpi;
                this.internalValue.dpi = value;

                if ( this.internalValue.unit !== "px" ) {
                    const ratio = value / oldValue;
                    // when changing DPI we keep the dimensions for the current unit the same
                    this.internalValue.width  *= ratio;
                    this.internalValue.height *= ratio;
                }
            },
        },
    },
    mounted(): void {
        this.internalValue = { ...this.modelValue };
    },
    watch: {
        internalValue( value ): void {
            this.$emit( "update:modelValue", value );
        },
    },
    methods: {
        valueFromPx( valueInPx: number ): number {
            const { dpi, unit } = this.internalValue;
            switch ( unit ) {
                default:
                case "px":
                    return Math.round( valueInPx );
                case "in":
                    return toFixedFloat( pixelsToInch( valueInPx, dpi ));
                case "cm":
                    return toFixedFloat( pixelsToCm( valueInPx, dpi ));
                case "mm":
                    return toFixedFloat( pixelsToMm( valueInPx, dpi ));
            }
        },
        valueToPx( value: number ): number {
            const { dpi, unit } = this.internalValue;
            switch ( unit ) {
                default:
                case "px":
                    return Math.round( value );
                case "in":
                    return inchesToPixels( value, dpi );
                case "cm":
                    return cmToPixels( value, dpi );
                case "mm":
                    return mmToPixels( value, dpi );
            }
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_variables";
@use "@/styles/form";

.title {
    color: #FFF;
    margin: variables.$spacing-medium 0 variables.$spacing-medium form.$labelWidth;
}

.select-combo {
    display: inline-flex;
    width: 65%;
}

.first {
    margin-right: variables.$spacing-small;
}

.wrapper--small .input-field {
    width: 90px !important;
}
</style>
