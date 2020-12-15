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
    <div class="toolbox-wrapper">
        <h2 v-t="'toolbox'"></h2>
        <div class="content">
            <button v-for="(button, index) in tools"
                    :key="button.type"
                    v-t="button.i18n"
                    class="tool-button"
                    :class="{ 'active': activeTool === button.type }"
                    @click="setActiveTool( button.type )"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import messages from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapGetters([
            "activeTool",
        ]),
        tools() {
            return [
                { type: "move", i18n: "move" }, { type: "zoom", i18n: "zoom" },
                { type: "brush", i18n: "brush" }
            ]
        },
    },
    methods: {
        ...mapMutations([
            "setActiveTool",
        ]),
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";
@import "@/styles/typography";

.toolbox-wrapper {
    @include component();
}

.tool-button {
    margin: $spacing-small;
    cursor: pointer;
    border-radius: $spacing-xsmall;
    border: none;
    padding: $spacing-medium;
    font-weight: bold;
    @include customFont();

    &:hover,
    &.active {
        background-color: $color-1;
        color: #FFF;
    }
}
</style>
