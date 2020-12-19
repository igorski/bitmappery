/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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

<script>
import "@simonwep/pickr/dist/themes/nano.min.css";
//import Pickr from "@simonwep/pickr/dist/pickr.es5.min"; // 3 x size of modern bundle
import Pickr from "@simonwep/pickr";

let pickrInstance;

const FRAC_VALUE = 0;

export default {
    props: {
        // the value is represented as RGBA
        value: {
            type: String,
            default: "rgba(255,255,255,1)",
        },
    },
    mounted() {
        pickrInstance = Pickr.create({
            el: this.$refs.picker,
            theme: "nano",
            default: this.value,
            defaultRepresentation: "HEX",
            components: {
                preview: true,
                opacity: true,
                hue: true,
                interaction: {
                    rgba: true,
                    hex: true,
                    cmyk: true,
                    input: true,
                    save: true
                }
            }
        });
        pickrInstance.on( "save", this.saveColor.bind( this ));
    },
    destroy() {
        pickrInstance?.destroyAndRemove();
    },
    methods: {
        saveColor( value ) {
            const rgba  = value.toRGBA();

            const red   = rgba[ 0 ].toFixed( FRAC_VALUE );
            const green = rgba[ 1 ].toFixed( FRAC_VALUE );
            const blue  = rgba[ 2 ].toFixed( FRAC_VALUE );
            const alpha = rgba[ 3 ];

            this.$emit( "input", `rgba(${red},${green},${blue},${alpha})` );
            pickrInstance.hide();
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

.color-picker {
    display: inline-block;
    margin-top: -$spacing-small;
}
</style>
