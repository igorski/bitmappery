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
    <div class="tool-option">
        <h3 v-t="'zoomLevel'"></h3>
        <slider
            v-model="zoomLevel"
            :min="1"
            :max="10"
            :interval=".1"
        />
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import Slider   from "@/components/ui/slider/slider";
import tools    from "@/definitions/tools";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Slider,
    },
    computed: {
        ...mapGetters([
            "zoomOptions",
        ]),
        zoomLevel: {
            get() {
                return this.zoomOptions.level;
            },
            set( value ) {
                this.setToolOptionValue({
                    tool: tools.ZOOM,
                    option: "level",
                    value
                });
            }
        }
    },
    methods: {
        ...mapMutations([
            "setToolOptionValue",
        ]),
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/tool-option";
</style>
