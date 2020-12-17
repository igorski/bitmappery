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
import{ mapGetters, mapMutations, mapActions } from "vuex";

export default {
    computed: {
        ...mapGetters([
            "activeDocument",
            "fileTarget",
            "layers",
        ])
    },
    methods: {
        ...mapMutations([
            "setActiveDocumentSize",
            "addNewDocument",
            "addLayer",
            "addGraphicToLayer",
        ]),
        ...mapActions([
            "addImage",
        ]),
        async addLoadedFile( file, { image, size }) {
            const { source } = await this.addImage({ file, image, size });

            image.src = source;

            const currentDocumentIsEmpty = this.layers?.length === 1 && !this.layers[ 0 ].graphics.length;

            switch ( this.fileTarget) {
                default:
                case "layer":
                    // if this is the first content of an existing document, scale document to image size
                    if ( currentDocumentIsEmpty ) {
                        this.setActiveDocumentSize( size );
                    } else if ( !this.activeDocument ) {
                        this.addNewDocument( file.name );
                    }
                    this.addLayer( file.name );
                    break;
                case "document":
                    if ( !currentDocumentIsEmpty ) {
                        this.addNewDocument( file.name );
                    }
                    this.setActiveDocumentSize( size );
                    break;
            }
            this.addGraphicToLayer({ index: this.layers.length - 1, bitmap: image, size });
        },
    }
};
