<template>
    <div class="resize-image-modal">
        <h2 v-t="'resizeDocument'"></h2>
        <div class="content form">
            <div class="wrapper input">
                <label v-t="'width'"></label>
                <input
                    v-model="width"
                    type="number"
                    name="width"
                />
            </div>
            <div class="wrapper input">
                <label v-t="'maintainAspectRatio'"></label>
                <input
                    v-model="maintainRatio"
                    type="checkbox"
                    name="ratio"
                />
            </div>
            <div class="wrapper input">
                <label v-t="'height'"></label>
                <input
                    v-model="height"
                    type="number"
                    name="height"
                />
            </div>
            <button
                v-t="'save'"
                type="button"
                @click="save()"
            ></button>
            <button
                v-t="'cancel'"
                type="button"
                @click="close()"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import messages from "./messages.json";

export default {
    i18n: { messages },
    data: () => ({
        width: 0,
        height: 0,
        ratio: 0,
        maintainRatio: true,
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
    },
    watch: {
        width( value ) {
            if ( !this.maintainRatio || this.ratio === 0 ) {
                return;
            }
            this.height = Math.round( value * this.ratio );
        },
        height( value ) {
            if ( !this.maintainRatio || this.ratio === 0 ) {
                return;
            }
            this.width = Math.round( value / this.ratio );
        },
    },
    created() {
        this.width  = this.activeDocument.width;
        this.height = this.activeDocument.height;
        this.ratio  = this.width / this.height;
    },
    methods: {
        ...mapMutations([
            "setActiveDocumentSize",
        ]),
        save() {
            this.setActiveDocumentSize({ width: this.width, height: this.height });
            this.close();
        },
        close() {
            this.$emit( "close" );
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";

.resize-image-modal {
    @include overlay();
    @include component();

    h2 {
        color: #FFF;
    }

    @include large() {
        $width: 480px;
        $height: 300px;

        width: $width;
        height: $height;
        left: calc(50% - #{$width / 2});
        top: calc(50% - #{$height / 2});
    }
}
</style>
