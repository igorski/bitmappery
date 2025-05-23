/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
    <div class="color-picker">
        <div ref="picker"></div>
    </div>
</template>

<script lang="ts">
import "@simonwep/pickr/dist/themes/nano.min.css";
//import Pickr from "@simonwep/pickr/dist/pickr.es5.min"; // 3 x size of modern bundle
import Pickr from "@simonwep/pickr";

const FRAC_VALUE = 0;

export default {
    emits: [ "update:modelValue" ],
    props: {
        // the value is represented as either HEXA or RGBA
        modelValue: {
            type: String,
            default: "rgba(255,255,255,1)",
        },
        colorType: {
            type: String,
            validator: ( value: string ) => /RGBA|HEXA/.test( value ),
            default: "RGBA",
        },
    },
    watch: {
        modelValue( color: string ): void {
            this.pickrInstance?.setColor( color );
        }
    },
    mounted(): void {
        this.pickrInstance = Pickr.create({
            el: this.$refs.picker,
            theme: "nano",
            default: this.modelValue,
            defaultRepresentation: "HEXA",
            components: {
                preview: true,
                opacity: true,
                hue: true,
                interaction: {
                    rgba: true,
                    hex: true,
                    hsla: true,
                    hsva: true,
                    cmyk: true,
                    input: true
                }
            }
        });
        this.pickrInstance.on( "change", this.saveColor.bind( this ));
        // hacky way to assign keyboard-service shortcut to open this picker
        if ( !window.pickrInstance ) {
            window.pickrInstance = this.pickrInstance;
            this.globalInstance = true;
        }
    },
    destroy(): void {
        this.pickrInstance?.destroyAndRemove();
        if ( this.globalInstance ) {
            window.pickrInstance = null;
        }
    },
    methods: {
        saveColor( value: { toHEXA: () => number[], toRGBA: () => number[] } ): void {
            let parsedValue: string;

            if ( this.colorType === "RGBA" ) {
                const rgba  = value.toRGBA();

                const red   = rgba[ 0 ].toFixed( FRAC_VALUE );
                const green = rgba[ 1 ].toFixed( FRAC_VALUE );
                const blue  = rgba[ 2 ].toFixed( FRAC_VALUE );
                const alpha = rgba[ 3 ];

                parsedValue = `rgba(${red},${green},${blue},${alpha})`;
            } else {
                parsedValue = value.toHEXA().toString();
            }

            if ( this.modelValue !== parsedValue ) {
                this.$emit( "update:modelValue", parsedValue );
            }
        },
    },
};
</script>
