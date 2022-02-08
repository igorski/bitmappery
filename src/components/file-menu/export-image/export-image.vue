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
                    <div v-if="fileSize" class="wrapper input">
                        <label v-t="'fileSize'"></label>
                        <div class="form-element">{{ fileSize }}</div>
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
                <div
                    v-if="base64preview"
                    class="preview-wrapper"
                    :class="{
                        'preview-wrapper--landscape': isLandscape,
                        'preview-wrapper--actual' : actualSize
                    }"
                >
                    <div class="preview-container">
                        <img
                            :src="base64preview"
                            class="preview-image"
                        />
                    </div>
                </div>
            </div>
        </template>
        <template #actions>
            <div class="export-actions">
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
            <div v-if="canChooseSize" class="wrapper input actual-size-button">
                <label v-t="'viewActualSize'"></label>
                <toggle-button
                    v-model="actualSize"
                    name="actualSize"
                />
            </div>
        </template>
    </modal>
</template>

<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import { ToggleButton } from "vue-js-toggle-button";
import Modal from "@/components/modal/modal";
import SelectBox from '@/components/ui/select-box/select-box';
import Slider from "@/components/ui/slider/slider";
import { MAX_SPRITESHEET_WIDTH } from "@/definitions/editor-properties";
import { EXPORTABLE_IMAGE_TYPES, GIF, typeToExt, isCompressableFileType } from "@/definitions/image-types";
import { supportsGIF, createGIF, createAnimatedGIF } from "@/services/gif-creation-service";
import { mapSelectOptions }  from "@/utils/search-select-util";
import { isLandscape, isSquare } from "@/math/image-math";
import { createDocumentSnapshot, createLayerSnapshot, tilesToSingle } from "@/utils/document-util";
import { resizeToBase64 } from "@/utils/canvas-util";
import { debounce } from "@/utils/debounce-util";
import { saveBlobAsFile, base64toBlob } from "@/utils/file-util";
import { displayAsKb } from "@/utils/string-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Modal,
        SelectBox,
        Slider,
        ToggleButton,
    },
    data: () => ({
        name: "",
        type: EXPORTABLE_IMAGE_TYPES[ 0 ],
        quality: 95,
        base64preview: null,
        layersToSpriteSheet: false,
        layersToAnimatedGIF: false,
        frameDurationMs: 100,
        sheetCols: 4,
        width: 1,
        height: 1,
        actualSize: false,
        canChooseSize: true,
    }),
    computed: {
        ...mapState([
            "loadingStates",
        ]),
        ...mapGetters([
            "activeDocument",
            "isLoading",
        ]),
        fileTypes() {
            const types = this.canCreateGIF ? [ ...EXPORTABLE_IMAGE_TYPES, GIF.mime ] : EXPORTABLE_IMAGE_TYPES;
            return mapSelectOptions( types );
        },
        hasQualityOptions() {
            return isCompressableFileType( this.type );
        },
        qualityPercentile() {
            return parseFloat(( this.quality / 100 ).toFixed( 2 ));
        },
        fileSize() {
            if ( !this.base64preview ) {
                return null;
            }
            return displayAsKb( Math.round( this.base64preview.length * 6 / 8 ));
        },
        canCreateSpriteSheet() {
            return this.activeDocument.layers.length > 1 &&
                   this.activeDocument.width <= MAX_SPRITESHEET_WIDTH &&
                   !this.layersToAnimatedGIF;
        },
        canCreateAnimatedGIF() {
            return this.canCreateGIF && this.type === GIF.mime &&
                   this.activeDocument.layers.length > 1 &&
                   this.activeDocument.width <= MAX_SPRITESHEET_WIDTH;
        },
        isLandscape() {
            return isLandscape( this.width, this.height ) || isSquare( this.width, this.height );
        },
    },
    watch: {
        // see additional watchers added in created hook
        sheetCols( amount ) {
            if ( this.layersToSpriteSheet ) {
                this.renderPreview();
            }
        }
    },
    created() {
        this.canCreateGIF = supportsGIF();
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
    beforeDestroy() {
        this.base64preview = null;
        this.snapshots = null;
        this.snapshot = null;
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setLoading",
            "unsetLoading",
        ]),
        async exportImage() {
            this.setLoading( "exp" );

            // zCanvas magnifies content by the pixel ratio for a crisper result, downscale
            // to actual dimensions of the document
            const { width, height } = this.activeDocument;
            const resizedImage = await resizeToBase64(
                this.base64preview,
                width,
                height,
                this.type,
                this.qualityPercentile,
                width  * ( window.devicePixelRatio || 1 ),
                height * ( window.devicePixelRatio || 1 )
            );
            const blob = await base64toBlob( resizedImage );

            saveBlobAsFile( blob, `${this.name}.${typeToExt(this.type)}` );
            this.unsetLoading( "exp" );
            this.closeModal();
        },
        async renderPreview() {
            const LOADING_KEY = "preview";
            if ( this.loadingStates.includes( LOADING_KEY )) {
                this.reRenderOnCompletion = true;
                return; // don't overload the preview renderer
            }
            this.setLoading( LOADING_KEY );

            const { width, height } = this.activeDocument;
            let snapshotCvs;

            const multiLayerExport = ( this.type === GIF.mime && this.layersToAnimatedGIF ) || this.layersToSpriteSheet;
            if ( multiLayerExport ) {
                // if we are going to work with individual layers, lazily create a list of layer snapshots
                if ( !this.snapshots ) {
                    this.snapshots = await Promise.all( this.activeDocument.layers.map( createLayerSnapshot ));
                }
                if ( this.layersToAnimatedGIF ) {
                    this.base64preview = await createAnimatedGIF( this.snapshots, this.frameDurationMs / 100 );
                }
                else if ( this.layersToSpriteSheet ) {
                    snapshotCvs = tilesToSingle( this.snapshots, width, height, parseFloat( this.sheetCols || "4" ));
                }
            } else {
                // merged layer export
                if ( !this.snapshot ) {
                    this.snapshot = await createDocumentSnapshot( this.activeDocument );
                }
                snapshotCvs = this.snapshot;
            }

            if ( snapshotCvs ) {
                this.width  = snapshotCvs.width;
                this.height = snapshotCvs.height;
                this.base64preview = await this.canvasToImageFormat( snapshotCvs );
            } else {
                this.width  = width;
                this.height = height;
            }

            // force actual size preview for small images
            if ( !this.actualSize && this.width < 400 && this.height < 400 ) {
                this.actualSize = true;
                this.canChooseSize = false;
            }
            this.unsetLoading( LOADING_KEY );

            if ( this.reRenderOnCompletion ) {
                this.reRenderOnCompletion = false;
                await debounce(); // unblock CPU prior to continuing next iteration
                this.renderPreview();
            }
        },
        async canvasToImageFormat( canvas ) {
            if ( this.type === GIF.mime ) {
                const base64gif = await createGIF( canvas );
                return base64gif;
            }
            return canvas.toDataURL( this.type, this.qualityPercentile );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";
@import "@/styles/typography";
@import "@/styles/ui";

.export-modal {
    $idealWidth: 990px;
    $idealHeight: 500px;
    $maxPreviewHeight: 445px;

    @include modalBase( $idealWidth, $idealHeight );

    .export-actions {
        display: flex;
    }

    @include componentIdeal( $idealWidth, $idealHeight ) {
        position: relative;

        .export-ui {
            display: flex;
            justify-content: space-between;
        }

        .export-form,
        .export-actions {
            flex: 0.4;
            margin-right: $spacing-xlarge;
        }

        .preview-wrapper {
            flex: 0.6;
            height: $maxPreviewHeight;
            overflow-x: hidden; // image is always full width
            overflow-y: scroll;
        }

        .export-actions {
            button {
                flex: 0.5;
            }
        }

        .actual-size-button {
            margin-left: auto;
            margin-top: $spacing-medium;

            label {
                margin-right: $spacing-small;
            }
        }
    }

    @include componentFallback( $idealWidth, $idealHeight ) {
        .preview-container {
            height: $maxPreviewHeight !important;
        }
        .preview-image {
            margin: $spacing-medium 0;
        }
        .export-actions {
            width: 100%;
        }
        .actual-size-button {
            display: none;
        }
    }

    .preview-wrapper {
        .preview-image {
            width: 100%;
        }

        &--landscape {
            overflow-y: hidden;
            overflow-x: auto;

            .preview-container {
                height: 100%;
            }

            .preview-image {
                width: auto;
                height: 100%;
            }
        }

        &--actual {
            overflow-x: auto;
            overflow-y: auto;

            .preview-image {
                width: auto !important;
                height: auto !important;
            }
        }
    }
}

.expl {
    @include smallText();
}
</style>
