/**
* The MIT License (MIT)
*
* Igor Zinken 2021-2025 - https://www.igorski.nl
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
        <div class="wrapper input">
            <label v-t="'unit'"></label>
            <div class="select-combo">
                <select-box
                    :options="units"
                    v-model="unit"
                    class="first"
                />
                <select-box
                    v-model="dpi"
                    :options="dpis"
                    :disabled="!showDPI"
                />
            </div>
        </div>
        <div class="wrapper input wrapper--small">
            <label v-t="'width'"></label>
            <input
                v-model.number="translatedWidth"
                type="number"
                name="width"
                class="input-field"
            />
        </div>
        <div class="wrapper input wrapper--small">
            <label v-t="'height'"></label>
            <input
                v-model.number="translatedHeight"
                type="number"
                name="height"
                class="input-field"
            />
        </div>
    </div>
</template>

<script lang="ts">
import SelectBox from "@/components/ui/select-box/select-box.vue";
import { pixelsToInch, pixelsToCm, pixelsToMm, inchesToPixels, cmToPixels, mmToPixels,  } from "@/math/unit-math";
import messages from "./messages.json";

const DPI   = [ 72, 97, 150, 300, 600 ];
const UNITS = [ "px", "in", "cm", "mm" ];

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
            validator: ({ width, height }) => typeof width === "number" && typeof height === "number"
        },
    },
    data: () => ({
        unit: UNITS[ 0 ],
        dpi: DPI[ 0 ].toString(),
        internalValue: {},
    }),
    computed: {
        showDPI(): boolean {
            return this.unit !== "px";
        },
        dpis(): { label: string, value: string }[] {
            return DPI.map( dpi => ({ label: `${dpi} DPI`, value: dpi.toString() }));
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
            set( value: number ): number {
                this.internalValue.height = this.valueToPx( value )
            },
        }
    },
    mounted() {
        this.internalValue = { ...this.modelValue };
    },
    watch: {
        internalValue( value ) {
            this.$emit( "update:modelValue", value );
        },
        dpi( value, oldValue = value ) {
            const ratio = value / oldValue;
            // when changing DPI we keep the dimensions for the current unit the same
            this.internalValue.width  *= ratio;
            this.internalValue.height *= ratio;
        }
    },
    methods: {
        valueFromPx( valueInPx: number ): number {
            const dpi = parseFloat( this.dpi );
            switch ( this.unit ) {
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
            switch ( this.unit ) {
                default:
                case "px":
                    return Math.round( value );
                case "in":
                    return inchesToPixels( value, this.dpi );
                case "cm":
                    return cmToPixels( value, this.dpi );
                case "mm":
                    return mmToPixels( value, this.dpi );
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
</style>
