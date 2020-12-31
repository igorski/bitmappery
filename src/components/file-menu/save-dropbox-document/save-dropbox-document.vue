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
    <modal>
        <template #header>
            <h2 v-t="'saveDocumentInDropbox'"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="requestSave()">
                <div class="wrapper input">
                    <label v-t="'documentTitle'"></label>
                    <input ref="nameInput"
                           type="text"
                           v-model="name"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                v-t="'save'"
                type="button"
                class="button"
                :disabled="!isValid"
                @click="requestSave()"
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
import { uploadBlob } from "@/services/dropbox-service";
import DocumentFactory from "@/factories/document-factory";
import { PROJECT_FILE_EXTENSION } from "@/store";

import messages from "./messages.json";
export default {
    i18n: { messages },
    components: {
        Modal,
    },
    data: () => ({
        name: "",
    }),
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
        isValid() {
            return this.name.length > 0;
        },
    },
    mounted() {
        this.name = this.activeDocument.name.split( "." )[ 0 ];
        this.$refs.nameInput.focus();
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "openDialog",
            "setActiveDocumentName",
            "showNotification",
        ]),
        async requestSave() {
            if ( !this.isValid ) {
                return;
            }
            this.setActiveDocumentName( this.name );
            try {
                const blob = DocumentFactory.toBlob( this.activeDocument );
                await uploadBlob( blob, `${this.name}${PROJECT_FILE_EXTENSION}` );
                this.showNotification({ message: this.$t( "fileSavedInDropbox", { file: this.name }) });
            } catch ( e ) {
                this.openDialog({ type: "error", message: this.$t( "errorOccurred" ) });
            }
            this.closeModal();
        },
    },
};
</script>
