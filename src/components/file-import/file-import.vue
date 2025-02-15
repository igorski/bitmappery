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
    <div class="file-import">
        <div class="component__header">
            <h2 v-t="'letsGetStarted'" class="component__title component__title--no-action"></h2>
        </div>
        <div class="form import-form">
            <p v-t="'chooseContentCreationMethod'"></p>
            <button
                v-t="'createNewDocument'"
                type="button"
                class="button button--primary button--block new-document-button"
                @click="requestNewDocument()"
            ></button>
            <div class="file-fieldset">
                <p v-t="'orImportFile'"></p>
                <!-- Local -->
                <file-selector />
                <!-- Dropbox -->
                <template v-if="hasDropbox">
                    <button
                        v-if="!dropbox"
                        v-t="'importFromDropbox'"
                        type="button"
                        class="button button--block button--third-party dropbox"
                        @click="dropbox = true"
                    ></button>
                    <component :is="dropboxImportType" />
                </template>
                <!-- Google Drive -->
                <template v-if="hasDrive">
                    <button
                        v-if="!drive"
                        v-t="'importFromGoogleDrive'"
                        type="button"
                        class="button button--block button--third-party drive"
                        @click="drive = true"
                    ></button>
                    <component :is="driveImportType" />
                </template>
                <!-- AWS S3 -->
                <template v-if="hasS3">
                    <button
                        v-if="!s3"
                        v-t="'importFromAwsS3'"
                        type="button"
                        class="button button--block button--third-party s3"
                        @click="s3 = true"
                    ></button>
                    <component :is="s3ImportType" />
                </template>
                <div class="wrapper input">
                    <label v-t="'openImageAsNew'" class="file-target-label"></label>
                    <select-box
                        :options="fileTargetOptions"
                        v-model="importTarget"
                        class="file-target-select"
                    />
                </div>
            </div>
            <p v-t="'fileAndHelpExpl'"></p>
        </div>
    </div>
</template>

<script lang="ts">
import { type Component, defineAsyncComponent } from "vue";
import { mapGetters, mapMutations } from "vuex";
import { CREATE_DOCUMENT } from "@/definitions/modal-windows";
import FileSelector from "./file-selector/file-selector.vue";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import { supportsDropbox, supportsGoogleDrive, supportsS3 } from "@/utils/cloud-service-loader";
import { mapSelectOptions } from "@/utils/search-select-util"
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        FileSelector,
        SelectBox,
    },
    data: () => ({
        dropbox: false,
        drive: false,
        s3: false,
        hasDropbox: supportsDropbox(),
        hasDrive: supportsGoogleDrive(),
        hasS3: supportsS3(),
    }),
    computed: {
        ...mapGetters([
            "fileTarget",
        ]),
        fileTargetOptions() {
            return mapSelectOptions([ "layer", "document" ]);
        },
        importTarget: {
            get() {
                return this.fileTarget;
            },
            set( value ) {
                this.setFileTarget( value );
            }
        },
        /**
         * Cloud import code is loaded at runtime to omit packaging
         * third party SDK within the core bundle.
         */
        dropboxImportType(): Promise<Component> | null {
            if ( this.dropbox ) {
                return defineAsyncComponent({
                    loader: () => import( "./dropbox-connector/dropbox-connector.vue" )
                });
            }
            return null;
        },
        driveImportType(): Promise<Component> | null {
            if ( this.drive ) {
                return defineAsyncComponent({
                    loader: () => import( "./google-drive-connector/google-drive-connector.vue" )
                });
            }
            return null;
        },
        s3ImportType(): Promise<Component> | null {
            if ( this.s3 ) {
                return defineAsyncComponent({
                    loader: () => import( "./aws-s3-connector/aws-s3-connector.vue" )
                });
            }
            return null;
        },
    },
    methods: {
        ...mapMutations([
            "openModal",
            "setFileTarget",
        ]),
        requestNewDocument(): void {
            this.openModal( CREATE_DOCUMENT );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/third-party";

.file-import {
    height: 100%;
    overflow-y: auto;
    text-align: center;
    background-color: #292929;
}

.file-fieldset {
    @include mixins.large() {
        border: 3px solid #444;
        border-radius: variables.$spacing-large;
        box-sizing: border-box;
        padding: variables.$spacing-small variables.$spacing-xlarge variables.$spacing-medium;
        margin: variables.$spacing-large 0 variables.$spacing-medium;
    }
}

.import-form {
    padding: 0 variables.$spacing-medium variables.$spacing-small;
    box-sizing: border-box;
    max-width: 420px;
    margin: 0 auto;
}

.new-document-button {
    width: 100%;
    margin-bottom: variables.$spacing-small;
}

.file-target-label,
.file-target-select {
    width: 50% !important;
}

.button--third-party:last-of-type {
    margin-bottom: variables.$spacing-medium;
}
</style>
