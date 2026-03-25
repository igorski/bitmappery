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
    <modal class="create-document">
        <template #header>
            <h2 v-t="'newDocument'" class="component__title"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="save()">
                <div class="wrapper input">
                    <label v-t="'name'"></label>
                    <input
                        ref="first"
                        v-model="name"
                        name="name"
                        class="input-field"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'documentType'"></label>
                    <select-box
                        :options="types"
                        v-model="type"
                    />
                </div>
                <dimensions-formatter
                    v-model="dimensions"
                />
                <div class="wrapper input">
                    <label v-t="'backgroundColor'"></label>
                    <color-picker
                        v-model="backgroundColor"
                        v-tooltip="$t('color')"
                        color-type="HEXA"
                        @open="handleColorPickerOpen"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'create'"
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

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import Modal from "@/components/modal/modal.vue";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import type { DocumentType } from "@/definitions/document";
import DocumentFactory from "@/factories/document-factory";
import ColorPicker from "@/components/ui/color-picker/color-picker.vue";
import DimensionsFormatter from "@/components/ui/dimensions-formatter/dimensions-formatter.vue";
import { focus } from "@/utils/environment-util";
import messages from "./messages.json";

const TRANSPARENT_COLOR = "#FFFFFF00"; 

export default {
    i18n: { messages },
    components: {
        ColorPicker,
        DimensionsFormatter,
        Modal,
        SelectBox,
    },
    data: () => ({
        name : "",
        type : "default",
        dimensions: {
            width: 1000,
            height: 1000,
        },
        backgroundColor: TRANSPARENT_COLOR,
        transparent: true,
    }),
    computed: {
        ...mapGetters([
            "documents",
        ]),
        types(): { label: string, value: DocumentType }[] {
            return [ { label: this.$t( "default" ), value: "default" }, { label: this.$t( "timeline" ), value: "timeline" }];
        },
    },
    mounted(): void {
        this.name = this.$t( "newDocumentNum", { num: this.documents.length + 1 });
        focus( this.$refs.first );
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "addNewDocument",
        ]),
        handleColorPickerOpen(): void {
            console.info('oooopen');
            if ( this.backgroundColor === TRANSPARENT_COLOR ) {
                this.backgroundColor = "#FFFFFF";
            }
        },
        async save(): Promise<void> {
            const meta = {
                bgColor: this.backgroundColor !== TRANSPARENT_COLOR ? this.backgroundColor : undefined,
            };
            this.addNewDocument( DocumentFactory.create({
                name   : this.name,
                type   : this.type,
                width  : Math.round( this.dimensions.width ),
                height : Math.round( this.dimensions.height ),
                meta,
            }));
            this.closeModal();
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/ui";

.create-document {
    @include ui.modalBase( 480px, 365px );
}
</style>
