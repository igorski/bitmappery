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
    <div class="options-panel-wrapper">
        <h2 v-if="!collapsed" v-t="'optionsPanel'"></h2>
        <button
            type="button"
            class="close-button"
            @click="collapsed = !collapsed"
        >{{ collapsed ? '&larr;' : '&rarr;' }}</button>
        <div
            v-if="!collapsed"
            class="content"
        >
            <file-selector />
        </div>
    </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import FileSelector from "./components/file-selector/file-selector";
import messages     from "./messages.json";

export default {
    i18n: { messages },
    components: {
        FileSelector,
    },
    computed: {
        ...mapState([
            "optionsPanelOpened",
        ]),
        collapsed: {
            get() {
                return !this.optionsPanelOpened;
            },
            set( value ) {
                this.setOptionsPanelOpened( !value );
            }
        },
    },
    methods: {
        ...mapMutations([
            "setOptionsPanelOpened",
        ]),
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";

.options-panel-wrapper {
    @include component();
    width: 100%;
    height: 100%;
}
</style>
