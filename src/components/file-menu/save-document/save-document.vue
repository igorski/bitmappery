/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
            <h2 v-t="'saveDocument'" class="component__title"></h2>
        </template>
        <template #content>
            <div
                class="form"
                @keyup.enter="requestSave()"
            >
                <div class="wrapper input">
                    <label v-t="'documentTitle'"></label>
                    <input
                        ref="nameInput"
                        type="text"
                         v-model="name"
                        class="input-field"
                    />
                </div>
                <div
                    v-if="hasCloudConnection"
                    class="wrapper input"
                >
                    <label v-t="'storageLocation'"></label>
                    <select-box
                        :options="storageLocations"
                        v-model="storageLocation"
                    />
                </div>
                <component :is="dropboxSaveComponent" ref="dropboxComponent" />
                <component :is="driveSaveComponent"   ref="driveComponent" />
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
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import Modal from "@/components/modal/modal";
import SelectBox from "@/components/ui/select-box/select-box";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import { focus } from "@/utils/environment-util";

import messages from "./messages.json";
export default {
    i18n: { messages },
    components: {
        Modal,
        SelectBox,
    },
    data: () => ({
        name : "",
        storageLocation : STORAGE_TYPES.LOCAL
    }),
    computed: {
        ...mapState([
            "dropboxConnected",
            "driveConnected",
            "storageType",
        ]),
        ...mapGetters([
            "activeDocument",
            "hasCloudConnection",
        ]),
        isValid() {
            return this.name.length > 0;
        },
        storageLocations() {
            const out = [{ label: this.$t( "local" ), value: STORAGE_TYPES.LOCAL }];
            if ( this.dropboxConnected ) {
                out.push({ label: this.$t( "dropbox" ), value: STORAGE_TYPES.DROPBOX });
            }
            if ( this.driveConnected ) {
                out.push({ label: this.$t( "drive" ), value: STORAGE_TYPES.DRIVE });
            }
            return out;
        },
        dropboxSaveComponent() {
            if ( this.storageLocation === STORAGE_TYPES.DROPBOX ) {
                return () => import( "./dropbox/save-dropbox-document" );
            }
            return null;
        },
        driveSaveComponent() {
            if ( this.storageLocation === STORAGE_TYPES.DRIVE ) {
                return () => import( "./google-drive/save-google-drive-document" );
            }
            return null;
        },
    },
    created() {
        this.storageLocation = this.storageType;
    },
    mounted() {
        this.name = this.activeDocument.name.split( "." )[ 0 ];
        focus( this.$refs.nameInput );
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setActiveDocumentName",
            "setLoading",
            "unsetLoading",
        ]),
        ...mapActions([
            "saveDocument",
        ]),
        requestSave() {
            if ( !this.isValid ) {
                return;
            }
            this.setActiveDocumentName( this.name );

            switch ( this.storageLocation ) {
                default:
                    this.setLoading( "sdoc" );
                    this.saveDocument( this.name );
                    this.unsetLoading( "sdoc" );
                    break;

                // by using refs we have tightly coupled these components
                // this however ensures we can separate the necessary SDK code
                // from the core bundle and minimize file size
                case STORAGE_TYPES.DROPBOX:
                    this.$refs.dropboxComponent.requestSave();
                    break;

                case STORAGE_TYPES.DRIVE:
                    this.$refs.driveComponent.requestSave();
                    break;
            }
            this.closeModal();
        },
    },
};
</script>
