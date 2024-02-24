/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
                    v-if="hasCloudStorage"
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
                <component :is="s3SaveComponent"      ref="s3Component" />
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

<script lang="ts">
import type { Component } from "vue";
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import Modal from "@/components/modal/modal.vue";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import DocumentFactory from "@/factories/document-factory";
import { supportsDropbox, supportsGoogleDrive, supportsS3 } from "@/utils/cloud-service-loader";
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
        storageLocation : STORAGE_TYPES.LOCAL,
        hasCloudStorage : supportsDropbox() || supportsGoogleDrive() || supportsS3(),
    }),
    computed: {
        ...mapState([
            "storageType",
        ]),
        ...mapGetters([
            "activeDocument",
        ]),
        isValid(): boolean {
            return this.name.length > 0;
        },
        storageLocations(): { label: string, value: STORAGE_TYPES }[] {
            const out = [{ label: this.$t( "local" ), value: STORAGE_TYPES.LOCAL }];
            if ( supportsDropbox() ) {
                out.push({ label: this.$t( "dropbox" ), value: STORAGE_TYPES.DROPBOX });
            }
            if ( supportsGoogleDrive() ) {
                out.push({ label: this.$t( "drive" ), value: STORAGE_TYPES.DRIVE });
            }
            if ( supportsS3() ) {
                out.push({ label: this.$t( "s3" ), value: STORAGE_TYPES.S3 });
            }
            return out;
        },
        dropboxSaveComponent(): Component {
            if ( this.storageLocation === STORAGE_TYPES.DROPBOX ) {
                return () => import( "./dropbox/save-dropbox-document.vue" );
            }
            return null;
        },
        driveSaveComponent(): Component {
            if ( this.storageLocation === STORAGE_TYPES.DRIVE ) {
                return () => import( "./google-drive/save-google-drive-document.vue" );
            }
            return null;
        },
        s3SaveComponent(): Component {
            if ( this.storageLocation === STORAGE_TYPES.S3 ) {
                return () => import( "./aws-s3/save-s3-document.vue" );
            }
            return null;
        },
    },
    created(): void {
        this.storageLocation = this.storageType;
    },
    mounted(): void {
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
        async requestSave(): Promise<void> {
            if ( !this.isValid ) {
                return;
            }
            this.setActiveDocumentName( this.name );
            
            const fileName = `${this.name}.${PROJECT_FILE_EXTENSION}`;
            let file: Blob;

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
                    file = await DocumentFactory.toBlob( this.activeDocument );
                    await this.$refs.dropboxComponent.requestSave( file, fileName );
                    break;

                case STORAGE_TYPES.DRIVE:
                    file = await DocumentFactory.toBlob( this.activeDocument );
                    await this.$refs.driveComponent.requestSave( file, fileName );
                    break;

                case STORAGE_TYPES.S3:
                    file = await DocumentFactory.toBlob( this.activeDocument );
                    await this.$refs.s3Component.requestSave( file, fileName );
                    break;
            }
            this.closeModal();
        },
    },
};
</script>
