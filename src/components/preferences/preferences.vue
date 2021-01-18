/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
    <modal>
        <template #header>
            <h2 v-t="'preferences'"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="save()">
                <div class="wrapper input">
                    <label v-t="'lowMemoryMode'"></label>
                    <toggle-button
                        v-model="internalValue.lowMemory"
                    />
                </div>
                <p v-t="'lowMemoryExpl'" class="expl"></p>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'save'"
                type="button"
                class="button"
                @click="save()"
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
import { mapGetters, mapMutations, mapActions } from "vuex";
import Modal from "@/components/modal/modal";
import { ToggleButton } from "vue-js-toggle-button";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Modal,
        ToggleButton,
    },
    data: () => ({
        internalValue: null,
    }),
    computed: {
        ...mapGetters([
            "preferences",
        ]),
    },
    created() {
        this.internalValue = { ...this.preferences };
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setPreferences",
        ]),
        ...mapActions([
            "storePreferences",
        ]),
        async save() {
            this.setPreferences( this.internalValue );
            await this.storePreferences();
            this.closeModal();
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables";
@import "@/styles/_colors";
@import "@/styles/_mixins";

.expl {
    font-size: 85%;
    padding: $spacing-medium;
    @include boxSize();
    background-image: $color-window-bg;
    border-radius: $spacing-medium;
}
</style>
