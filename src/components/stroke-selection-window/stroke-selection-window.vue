/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022 - https://www.igorski.nl
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
    <modal class="stroke-selection">
        <template #header>
            <h2 v-t="'strokeSelection'" class="component__title"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="stroke()">
                <div class="wrapper input">
                    <label v-t="'strokeSize'"></label>
                    <input
                        ref="sizeInput"
                        v-model.number="size"
                        type="number"
                        min="1"
                        max="999"
                        class="input-field size-input"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'strokeColor'"></label>
                    <color-picker
                        v-model="color"
                        class="color-picker"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'stroke'"
                type="button"
                class="button"
                :disabled="!isValid"
                @click="stroke()"
            ></button>
            <button
                v-t="'cancel'"
                type="button"
                class="button"
                @click="closeModal()"
            ></button>
        </template>
    </modal>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import ColorPicker from "@/components/ui/color-picker/color-picker";
import Modal from "@/components/modal/modal";
import { getSpriteForLayer } from "@/factories/sprite-factory";
import { focus } from "@/utils/environment-util";

import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        ColorPicker,
        Modal,
    },
    data: () => ({
        size: 1,
        color: null,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
            "activeLayer",
            "activeColor",
        ]),
        isValid() {
            return this.size > 0 && this.color;
        },
    },
    created() {
        this.color = this.activeColor;
    },
    mounted() {
        focus( this.$refs.sizeInput );
    },
    methods: {
        ...mapMutations([
            "closeModal",
        ]),
        stroke() {
            if ( !this.isValid ) {
                return;
            }
            getSpriteForLayer( this.activeLayer ).paint({
                type      : "stroke",
                size      : this.size,
                color     : this.color,
                selection : this.activeDocument.selection
            });
            this.closeModal();
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables";
@import "@/styles/ui";

.stroke-selection {
    @include modalBase( 480px, 200px );
}

.color-picker {
    width: 50%;
    display: inline-block;
    transform: translateY(-$spacing-xsmall);
}

.size-input {
    width: 80px !important;
}
</style>
