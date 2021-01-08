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
            <h2 v-t="'newDocument'"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="save()">
                <div class="wrapper input">
                    <label v-t="'name'"></label>
                    <input
                        ref="first"
                        v-model="name"
                        name="name"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'width'"></label>
                    <input
                        v-model.number="width"
                        type="number"
                        name="width"
                    />
                </div>
                <div class="wrapper input">
                    <label v-t="'height'"></label>
                    <input
                        v-model.number="height"
                        type="number"
                        name="height"
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

<script>
import { mapGetters, mapMutations } from "vuex";
import Modal from "@/components/modal/modal";
import DocumentFactory from "@/factories/document-factory";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Modal,
    },
    data: () => ({
        name   : "",
        width  : 1000,
        height : 1000,
    }),
    computed: {
        ...mapGetters([
            "documents",
        ]),
    },
    mounted() {
        this.name = this.$t( "newDocumentNum", { num: this.documents.length + 1 });
        this.$refs.first.focus();
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "addNewDocument",
        ]),
        async save() {
            this.addNewDocument( DocumentFactory.create({
                name: this.name,
                width: this.width,
                height: this.height
            }));
            this.closeModal();
        },
    }
};
</script>