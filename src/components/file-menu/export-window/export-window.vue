/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
    <modal class="export-modal">
        <template #header>
            <h2 v-t="'exportImage'" class="component__title"></h2>
        </template>
        <template #content>
            <div class="export-ui">
                <div class="form export-form" @keyup.enter="exportImage">
                    <div class="wrapper input">
                        <label v-t="'imageType'"></label>
                        <select-box :options="fileTypes"
                                     v-model="type"
                        />
                    </div>
                    <div
                        v-if="hasQualityOptions"
                        class="wrapper slider"
                    >
                        <label v-t="'imageQuality'"></label>
                        <slider
                            v-model="quality"
                            :min="0"
                            :max="100"
                        />
                    </div>
                    <div class="wrapper input">
                        <label v-t="'fileName'"></label>
                        <input
                            type="text"
                            v-model="name"
                            class="input-field"
                        />
                    </div>
                    <template v-if="canCreateAnimatedGIF">
                        <div class="wrapper input">
                            <label v-t="'layersToAnimation'"></label>
                            <toggle-button
                                v-model="layersToAnimatedGIF"
                                name="createAnimatedGIF"
                            />
                        </div>
                        <div v-if="layersToAnimatedGIF" class="wrapper input">
                            <label v-t="'frameDuration'"></label>
                            <input
                                type="number"
                                v-model="frameDurationMs"
                                class="input-field"
                            />
                        </div>
                    </template>
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
                    <template v-if="canCreateSpriteSheet">
                        <p v-t="'layersToSheetExpl'" class="expl"></p>
                        <div class="wrapper input">
                            <label v-t="'layersToSpriteSheet'"></label>
                            <toggle-button
                                v-model="layersToSpriteSheet"
                                name="layersToSpritesheet"
                            />
                        </div>
                        <template v-if="layersToSpriteSheet">
                            <div class="wrapper input">
                                <label v-t="'columnAmount'"></label>
                                <input
                                    type="number"
                                    v-model="sheetCols"
                                    class="input-field"
                                />
                            </div>
                        </template>
                    </template>
                </div>
                <document-preview
                    v-if="showOriginal && previewOriginalBlob"
                    class="document-preview"
                    ref="previewOriginal"
                    :title="$t('original')"
                    :src="previewOriginalBlob"
                    :is-actual-size="actualSize"
                    :is-landscape="isLandscape"
                    @scroll="syncScroll( false, $event )"
                />
                <document-preview
                    v-if="previewBlob"
                    class="document-preview"
                    ref="previewExport"
                    :title="$t('exported', { type: selectedType, quality: hasQualityOptions ? quality : 100 })"
                    :src="previewBlob"
                    :is-actual-size="actualSize"
                    :is-landscape="isLandscape"
                    @scroll="syncScroll( true, $event )"
                />
            </div>
        </template>
        <template #actions>
            <div class="export-actions">
                <div class="export-actions__group">
                    <button
                        v-t="'export'"
                        type="button"
                        class="button"
                        :disabled="isLoading"
                        @click="exportImage()"
                    ></button>
                    <button
                        v-t="'cancel'"
                        type="button"
                        class="button"
                        @click="closeModal()"
                    ></button>
                </div>
                <div class="export-actions__group export-options">
                    <div v-if="showOriginal" class="wrapper input option-button">
                        <label v-t="'syncScroll'"></label>
                        <toggle-button
                            v-model="syncPreviews"
                            name="syncPreviews"
                        />
                    </div>
                    <div v-if="canChooseSize" class="wrapper input option-button">
                        <label v-t="'viewActualSize'"></label>
                        <toggle-button
                            v-model="actualSize"
                            name="actualSize"
                        />
                    </div>
                </div>
            </div>
        </template>
    </modal>
</template>

<script lang="ts">
import { type Component, defineAsyncComponent } from "vue";
import { mapState, mapGetters, mapMutations } from "vuex";
import DocumentPreview, { type PreviewScrollPos } from "@/components/document-preview/document-preview.vue"
import Modal from "@/components/modal/modal.vue";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import Slider from "@/components/ui/slider/slider.vue";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import { MAX_SPRITESHEET_WIDTH } from "@/definitions/editor-properties";
import { EXPORTABLE_IMAGE_TYPES, GIF, typeToExt, isCompressableFileType } from "@/definitions/image-types";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import { supportsGIF, createGIF, createAnimatedGIF } from "@/services/gif-creation-service";
import { mapSelectOptions, type SelectOption }  from "@/utils/search-select-util";
import { isLandscape, isSquare } from "@/math/image-math";
import { canvasToBlob, resizeImage, getPixelRatio } from "@/utils/canvas-util";
import { supportsDropbox, supportsGoogleDrive, supportsS3 } from "@/utils/cloud-service-loader";
import { unblockedWait } from "@/utils/debounce-util";
import { createDocumentSnapshot, createLayerSnapshot, tilesToSingle } from "@/utils/document-util";
import { base64toBlob, saveBlobAsFile } from "@/utils/file-util";
import messages from "./messages.json";

const SMALL_IMAGE_SIZE_PX = 400;

export default {
    i18n: { messages },
    components: {
        DocumentPreview,
        Modal,
        SelectBox,
        Slider,
        ToggleButton,
    },
    data: () => ({
        name: "",
        type: EXPORTABLE_IMAGE_TYPES[ 0 ],
        quality: 95,
        previewOriginalBlob: null,
        previewBlob: null,
        syncPreviews: false,
        layersToSpriteSheet: false,
        layersToAnimatedGIF: false,
        frameDurationMs: 100,
        sheetCols: 4,
        width: 1,
        height: 1,
        actualSize: false,
        canChooseSize: true,
        storageLocation : STORAGE_TYPES.LOCAL,
        hasCloudStorage : supportsDropbox() || supportsGoogleDrive() || supportsS3(),
    }),
    computed: {
        ...mapState([
            "loadingStates",
            "windowSize",
        ]),
        ...mapGetters([
            "activeDocument",
            "isLoading",
        ]),
        showOriginal(): boolean {
            // see _variables.scss $preview-ideal-width and $preview-ideal-height
            return this.windowSize.width >= 1280 && this.windowSize.height >= 700;
        },
        selectedType(): string {
            return typeToExt( this.type );
        },
        fileTypes(): SelectOption[] {
            const types = this.canCreateGIF ? [ ...EXPORTABLE_IMAGE_TYPES, GIF.mime ] : EXPORTABLE_IMAGE_TYPES;
            return mapSelectOptions( types );
        },
        hasQualityOptions(): boolean {
            return isCompressableFileType( this.type );
        },
        qualityPercentile(): number {
            return parseFloat(( this.quality / 100 ).toFixed( 2 ));
        },
        canCreateSpriteSheet(): boolean {
            return this.activeDocument.layers.length > 1 &&
                   this.activeDocument.width <= MAX_SPRITESHEET_WIDTH &&
                   !this.layersToAnimatedGIF;
        },
        canCreateAnimatedGIF(): boolean {
            return this.canCreateGIF && this.type === GIF.mime &&
                   this.activeDocument.layers.length > 1 &&
                   this.activeDocument.width <= MAX_SPRITESHEET_WIDTH;
        },
        isLandscape(): boolean {
            return isLandscape( this.width, this.height ) || isSquare( this.width, this.height );
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
        dropboxSaveComponent(): Promise<Component> | null {
            if ( this.storageLocation === STORAGE_TYPES.DROPBOX ) {
                return defineAsyncComponent({
                    loader: () => import( "@/components/file-menu/save-document/dropbox/save-dropbox-document.vue" )
                });
            }
            return null;
        },
        driveSaveComponent(): Promise<Component> | null {
            if ( this.storageLocation === STORAGE_TYPES.DRIVE ) {
                return defineAsyncComponent({
                    loader: () => import( "@/components/file-menu/save-document/google-drive/save-google-drive-document.vue" )
                });
            }
            return null;
        },
        s3SaveComponent(): Promise<Component> | null {
            if ( this.storageLocation === STORAGE_TYPES.S3 ) {
                return defineAsyncComponent({
                    loader: () => import( "@/components/file-menu/save-document/aws-s3/save-s3-document.vue" )
                });
            }
            return null;
        },
    },
    watch: {
        // see additional watchers added in created hook
        sheetCols(): void {
            if ( this.layersToSpriteSheet ) {
                this.renderPreview();
            }
        },
        syncPreviews( enabled: boolean ): void {
            if ( !enabled ) {
                return;
            }
            this.syncScroll( true, { left: this.width / 2, top: this.height / 2 }); // syncing one syncs the other =)
        },
    },
    created(): void {
        this.canCreateGIF = supportsGIF();
        if ( this.showOriginal ) {
            this.syncPreviews = true;
        }
        this.name = this.activeDocument.name.split( "." )[ 0 ];
        [
            // changes to any of the export properties should trigger a re-render
            "quality", "type", "layersToSpriteSheet", "layersToAnimatedGIF", "frameDurationMs"
        ].forEach( property => {
            this.$watch( property, () => {
                this.renderPreview();
            });
        });
        this.renderPreview();
    },
    beforeUnmount(): void {
        this.previewOriginalBlob = null;
        this.previewBlob = null;
        this.snapshots = null;
        this.snapshot = null;
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setLoading",
            "unsetLoading",
        ]),
        async exportImage(): Promise<void> {
            this.setLoading( "exp" );

            const file = this.previewBlob;
            const fileName = `${this.name}.${typeToExt(this.type)}`;
            
            switch ( this.storageLocation ) {
                default:
                    saveBlobAsFile( file, fileName );
                    break;

                // by using refs we have tightly coupled these components
                // this however ensures we can separate the necessary SDK code
                // from the core bundle and minimize file size
                case STORAGE_TYPES.DROPBOX:
                    await this.$refs.dropboxComponent.requestSave( file, fileName );
                    break;

                case STORAGE_TYPES.DRIVE:
                    await this.$refs.driveComponent.requestSave( file, fileName );
                    break;

                case STORAGE_TYPES.S3:
                    await this.$refs.s3Component.requestSave( file, fileName );
                    break;
            }
            this.unsetLoading( "exp" );
            this.closeModal();
        },
        async renderPreview(): Promise<void> {
            const LOADING_KEY = "preview";
            if ( this.loadingStates.includes( LOADING_KEY )) {
                this.reRenderOnCompletion = true;
                return; // don't overload the preview renderer
            }
            this.setLoading( LOADING_KEY );

            const { width, height } = this.activeDocument;

            // created merged layer export and scale it to original (pixel ratio agnostic) dimensions
            if ( !this.snapshot ) {
                this.snapshot = await resizeImage(
                    await createDocumentSnapshot( this.activeDocument ),
                    width, height, 0, 0, width * getPixelRatio(), height * getPixelRatio()
                );
                this.previewOriginalBlob = await canvasToBlob( this.snapshot );
            }
            let snapshotCvs;

            const multiLayerExport = ( this.type === GIF.mime && this.layersToAnimatedGIF ) || this.layersToSpriteSheet;
            if ( multiLayerExport ) {
                // if we are going to work with individual layers, lazily create a list of layer snapshots
                if ( !this.snapshots ) {
                    this.snapshots = await Promise.all( [ ...this.activeDocument.layers ].reverse().map( async layer => {
                        return resizeImage(
                            await createLayerSnapshot( layer, this.activeDocument ),
                            width, height, 0, 0, width * getPixelRatio(), height * getPixelRatio()
                        );
                    }));
                }
                if ( this.layersToAnimatedGIF ) {
                    this.previewBlob = await base64toBlob(
                        await createAnimatedGIF( this.snapshots, this.frameDurationMs / 100 )
                    );
                }
                else if ( this.layersToSpriteSheet ) {
                    snapshotCvs = tilesToSingle( this.snapshots, width, height, parseFloat( this.sheetCols || "4" ));
                }
            } else {
                snapshotCvs = this.snapshot;
            }

            if ( snapshotCvs ) {
                this.width  = snapshotCvs.width;
                this.height = snapshotCvs.height;
                this.previewBlob = await this.snapshotToImageFormat( snapshotCvs );
            } else {
                this.width  = width;
                this.height = height;
            }

            // force actual size preview for small images
            if ( !this.actualSize && this.width < SMALL_IMAGE_SIZE_PX && this.height < SMALL_IMAGE_SIZE_PX ) {
                this.actualSize = true;
                this.canChooseSize = false;
            }
            this.unsetLoading( LOADING_KEY );

            if ( this.reRenderOnCompletion ) {
                this.reRenderOnCompletion = false;
                await unblockedWait(); // unblock CPU prior to continuing next iteration
                this.renderPreview();
            }
        },
        async snapshotToImageFormat( canvas: HTMLCanvasElement ): Promise<Blob> {
            let base64: string;
            if ( this.type === GIF.mime ) {
                base64 = await createGIF( canvas );
            } else {
                base64 = canvas.toDataURL( this.type, this.qualityPercentile );
            }
            return await base64toBlob( base64 );
        },
        syncScroll( isExport: boolean, scrollPos: PreviewScrollPos ): void {
            if ( !this.syncPreviews ) {
                return;
            }
            if ( isExport ) {
                this.$refs.previewOriginal?.setScroll( scrollPos );
            } else {
                this.$refs.previewExport.setScroll( scrollPos );
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/component";
@use "@/styles/typography";
@use "@/styles/ui";

$idealFormWidth: 340px;

.export-modal {
    width: 100%;
    @include ui.modalBase( variables.$ideal-width, variables.$preview-ideal-height );
    
    .export-form {
        width: $idealFormWidth;
        max-width: $idealFormWidth;
    }

    .export-actions {
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: center;
    }

    @include mixins.large() {
        .export-actions button {
            width: math.div( $idealFormWidth, 2 );
        }
    }

    @include mixins.mobile() {
        .export-form {
            width: calc(100% - 16pt);
            max-width: unset;
        }

        .document-preview {
            margin: variables.$spacing-medium 0 0 !important;
        }

        .export-ui {
            display: initial !important;
        }
    }

    @include mixins.componentIdeal( variables.$preview-ideal-width, variables.$preview-ideal-height ) {
        width: variables.$preview-ideal-width;
        position: relative;

        .export-ui {
            display: flex;
            justify-content: space-between;
        }

        .document-preview {
            width: 420px;
        }

        .export-actions__group {
            display: flex;
        }

        .option-button {
            label {
                margin-right: variables.$spacing-small;
            }
        }
    }

    @include mixins.minHeight( variables.$preview-ideal-height ) {
        height: variables.$preview-ideal-height;
    }

    @include mixins.componentFallback( variables.$preview-ideal-width, variables.$preview-ideal-height ) {
        // this view does not fit the original and export preview side-by-side, only show export
        .export-ui {
            display: flex;
        }

        .document-preview {
            flex: 1;
            margin-left: variables.$spacing-medium;
            height: variables.$preview-max-height !important;
        }

        .export-actions__group {
            display: flex;
            width: 100%;
        }
    
        .export-options {
            display: none;
        }
    }
}

.expl {
    @include typography.smallText();
}
</style>
