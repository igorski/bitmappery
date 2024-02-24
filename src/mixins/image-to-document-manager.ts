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
import { mapGetters, mapMutations, mapActions } from "vuex";
import type { Size } from "zcanvas";
import type { Document, Layer } from "@/definitions/document";
import type { SizedImage } from "@/definitions/editor";
import { isTransparent } from "@/definitions/image-types";
import { ACCEPTED_FILE_EXTENSIONS, PSD, PDF, isImageFile, isProjectFile, isThirdPartyDocument } from "@/definitions/file-types";
import { LayerTypes } from "@/definitions/layer-types";
import { loadImageFiles } from "@/services/file-loader-queue";

// third party files are handled by their own import services which are lazily loaded

type ThirdPartyServiceImport = ( file: File ) => Promise<Document>;

let importPSD: ThirdPartyServiceImport;
let importPDF: ThirdPartyServiceImport;

export default {
    computed: {
        ...mapGetters([
            "activeDocument",
            "fileTarget",
            "layers",
        ])
    },
    created(): void {
        this.acceptedFileTypes = ACCEPTED_FILE_EXTENSIONS.map( ext => `.${ext}` ).join( "," );
    },
    methods: {
        ...mapMutations([
            "setActiveDocumentSize",
            "addNewDocument",
            "addLayer",
            "updateLayer",
            "setImageSourceUsage",
            "setLoading",
            "unsetLoading",
        ]),
        ...mapActions([
            "addImage",
            "loadDocument",
        ]),
        async addLoadedFile( file: File, { image, size }: SizedImage ): Promise<void> {
            const { source } = await this.addImage({ file, image, size });

            image.src = source;

            const currentDocumentIsEmpty = this.layers?.length <= 1 && this.layers?.[0]?.source === null;
            const layerOpts = {
                source: image,
                type: LayerTypes.LAYER_IMAGE,
                name: file.name,
                transparent: isTransparent( file ),
                ...size,
            };

            switch ( this.fileTarget) {
                default:
                case "layer":
                    // if this is the first content of an existing document, scale document to image size
                    if ( !this.activeDocument ) {
                        this.addNewDocument( file.name );
                        this.registerUsage( source );
                        return this.updateSizeAndLayer( size, layerOpts );
                    } else if ( currentDocumentIsEmpty ) {
                        this.setActiveDocumentSize( size );
                    }
                    this.addLayer( layerOpts );
                    break;
                case "document":
                    if ( !currentDocumentIsEmpty ) {
                        this.addNewDocument( file.name );
                    }
                    this.updateSizeAndLayer( size, layerOpts );
                    break;
            }
            this.registerUsage( source );
        },
        async handleFileSelect({ target }: Event ): Promise<void> {
            const files = ( target as any )?.files;
            if ( !files || files.length === 0 ) {
                return;
            }

            // separate BitMappery documents from image files and third party documents

            const bpyDocuments: File[] = [];
            const tpyDocuments: File[] = [];
            const imageFiles: File[]   = [];

            for ( let i = 0, l = files.length; i < l; ++i ) {
                const file = files[ i ];
                if ( isProjectFile( file )) {
                    bpyDocuments.push( file );
                } else if ( isThirdPartyDocument( file )) {
                    tpyDocuments.push( file );
                } else if ( isImageFile( file )) {
                    imageFiles.push( file );
                }
            }

            const LOADING_KEY = `itd_${Date.now()}`;
            this.setLoading( LOADING_KEY );

            // load the image files

            //const start = Date.now();
            await loadImageFiles( imageFiles, this.addLoadedFile.bind( this ));
            //const elapsed = Date.now() - start;

            // load the BitMappery documents

            for ( const doc of bpyDocuments ) {
                await this.loadDocument( doc );
            }

            // load the third party Documents
            await this.loadThirdPartyDocuments( tpyDocuments );

            this.unsetLoading( LOADING_KEY );
        },
        async loadThirdPartyDocuments( documents: File[] = [], optMime?: string ): Promise<void> {
            if ( !documents.length ) {
                return;
            }
            for ( const file of documents ) {
                const serviceImport = await getServiceForThirdPartyFile( optMime || file.type );
                const doc = await serviceImport( file );
                if ( doc !== null ) {
                    this.addNewDocument( doc );
                }
            }
        },
        updateSizeAndLayer( size: Size, opts: Partial<Layer> ): void {
            this.setActiveDocumentSize( size );
            this.updateLayer({ index: this.layers.length - 1, opts });
        },
        registerUsage( source: string ): void {
            this.setImageSourceUsage({ source, document: this.activeDocument });
        },
     }
};

/* internal methods */

async function getServiceForThirdPartyFile( mime: string ): Promise<ThirdPartyServiceImport> {
    switch ( mime ) {
        default:
        case PSD.mime:
            if ( !importPSD ) {
                ({ importPSD } = await import( "@/services/psd-import-service" ));
            }
            return importPSD;

        case PDF.mime:
            if ( !importPDF ) {
                ({ importPDF } = await import( "@/services/pdf-import-service" ));
            }
            return importPDF;
    }
}
