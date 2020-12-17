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
    <nav class="menu"
         :class="{ opened: menuOpened }"
    >
        <div class="toggle" @click="setMenuOpened(!menuOpened)">
            <span>&#9776;</span>
        </div>
        <h1>
            Photo<span class="emphasis">Mound</span>
        </h1>
        <ul class="menu-list">
            <li>
                <a v-t="'file'" class="title" @click.prevent></a>
                <ul class="submenu">
                    <li>
                        <button v-t="'newDocument'"
                                @click="requestNewDocument()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'loadDocument'"
                                type="button"
                                @click="loadDocument()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'saveDocument'"
                                type="button"
                                :disabled="noDocumentsAvailable"
                                @click="requestDocumentSave()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'closeDocument'"
                                :disabled="noDocumentsAvailable"
                                @click="requestDocumentClose()"
                        ></button>
                    </li>
                    <li>
                        <button v-t="'exportImage'"
                                type="button"
                                :disabled="noDocumentsAvailable"
                                @click="requestImageExport()"
                        ></button>
                    </li>
                </ul>
            </li>
            <li>
                <a v-t="'edit'" class="title" @click.prevent></a>
                <ul class="submenu">
                    <li>
                        <button v-t="'resizeDocument'"
                                type="button"
                                :disabled="noDocumentsAvailable"
                                @click="requestDocumentResize()"
                        ></button>
                    </li>
                </ul>
            </li>
            <li>
                <a v-t="'window'" class="title" @click.prevent></a>
                <ul class="submenu">
                    <li v-for="(doc, index) in documents"
                        :key="`doc_${index}`"
                    >
                        <button @click="setActiveDocument( index )">
                            {{ $t( "windowNumName", { num: index + 1, name: doc.name }) }}
                        </button>
                    </li>
                </ul>
            </li>
        </ul>
        <!-- fullscreen button -->
        <div v-if="supportsFullscreen"
            v-t="'maximize'"
            ref="fullscreenBtn"
            class="fullscreen-button"
            data-api-fullscreen
        ></div>
    </nav>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions }  from "vuex";
import { RESIZE_DOCUMENT, SAVE_DOCUMENT, EXPORT_IMAGE } from "@/definitions/modal-windows";
import { supportsFullscreen, setToggleButton } from "@/utils/environment-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapState([
            "menuOpened",
            "blindActive"
        ]),
        ...mapGetters([
            "activeDocument",
            "documents",
        ]),
        supportsFullscreen,
        noDocumentsAvailable() {
            return !this.activeDocument;
        },
    },
    watch: {
        blindActive( isOpen, wasOpen ) {
            if ( !isOpen && wasOpen === true ) {
                this.setMenuOpened( false );
            }
        }
    },
    mounted() {
        if ( this.$refs.fullscreenBtn ) {
            setToggleButton( this.$refs.fullscreenBtn, this.$t( "maximize" ), this.$t( "minimize" ));
        }
    },
    methods: {
        ...mapMutations([
            "setMenuOpened",
            "openModal",
            "setActiveDocument",
            "addNewDocument",
            "closeActiveDocument",
            "showNotification",
        ]),
        ...mapActions([
            "requestNewDocument",
            "requestDocumentClose",
            "loadDocument",
        ]),
        requestImageExport() {
            this.openModal( EXPORT_IMAGE );
        },
        requestDocumentResize() {
            this.openModal( RESIZE_DOCUMENT );
        },
        requestDocumentSave() {
            this.openModal( SAVE_DOCUMENT );
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins.scss";
$toggle-width: 50px;

.menu {
    color: #b6b6b6;
    display: block;
    margin: 0 auto;
    padding: $spacing-small $spacing-medium;
    width: 100%;
    background-image: $color-window-bg;
    @include boxSize();

    @include large() {
        min-width: 100%;
        max-width: $ideal-width;
        margin: 0 auto;
        padding-left: $spacing-large;
    }

    @include mobile() {
        height: $menu-height;
        position: fixed;
        z-index: 2;
        overflow: hidden;
        width: 100%;
        top: 0;
        left: 0;

        &.opened {
            position: absolute;
            overflow-y: auto;
            height: 100%;

            .menu-list {
                left: 0;
                display: block;
                height: 100%;
            }
        }

        .toggle {
            display: block;
        }

        h1 {
            display: none;
        }

        ul {
            display: block;
            width: 100%;
            padding: 0;

            li {
                display: block;
                width: 100%;

                a {
                    width: 100%;
                }
            }
        }

        ul {
            h1 {
               display: none;
            }

            li {
                padding: $spacing-small $spacing-large;

                .submenu li {
                    padding: $spacing-small 0;
                }

                a {
                    display: block;
                    width: 100%;
                    padding: $spacing-medium $spacing-large;
                    color: #000;

                    &:hover {
                        color: #000;
                    }
                }

                &.active a {
                    border-bottom: none;
                    color: #FFF;
                    font-weight: bold;
                    font-style: italic;
                    background-color: $color-1;
                }
            }
        }
    }
}

.toggle {
    position: absolute;
    display: none;
    cursor: pointer;
    top: 0;
    left: 0;
    width: $toggle-width;
    height: $menu-height;

    span {
        position: absolute;
        top: 50%;
        left: 50%;
        margin-top: -$spacing-medium;
        margin-left: -$spacing-medium;
    }
}

h1 {
    display: inline;
    margin: 0;
    padding: 0;
    padding-right: $spacing-medium;
    font-size: 110%;
    font-weight: bold;

    .emphasis {
        color: #FFF;
    }
}

.menu-list {
    display: inline;
    list-style-type: none;
    padding: 0;
    margin: 0;
    @include boxSize();

    li {
        display: inline-block;
        padding: 0 $spacing-medium 0 0;
        margin: 0;
        font-family: Montserrat, Helvetica, Verdana;
        cursor: pointer;

        a {
            color: #b6b6b6;
            text-decoration: none;
            padding-bottom: $spacing-large;
        }

        &:hover,
        &:hover a {
            color: $color-1;
            border-bottom: none;
            text-decoration: none;
        }

        &.active {
            a {
                border-bottom: 3px solid #555;
            }
        }

        button {
            background: none;
            cursor: pointer;
            border: none;
            color: #b6b6b6;
            margin: 0;
            padding: 0;

            &:disabled {
                color: #666;
            }
        }

        ul {
            list-style: none;
        }

        @include large() {
            &:hover, &:focus {
                a {
                    color: $color-1;
                }
                ul {
                    display: block;
                    z-index: 2;
                }
            }
            ul {
                display: none;
                position: absolute;
                box-shadow: 0 0 5px rgba(0,0,0,.5);
                padding: $spacing-medium;
                background-image: $color-window-bg;
                background-repeat: repeat-x;
                @include boxSize();
            }
        }
    }

    @include mobile() {
        position: absolute;
        top: $menu-height;
        background-image: linear-gradient(to bottom,#fff 35%,#eee 90%);
        background-repeat: repeat-x;
        display: none;

        .title {
            display: none;
        }
    }
}

.submenu {
    @include large() {
        li {
            display: block;
            color: #b6b6b6;
            padding: $spacing-xsmall $spacing-medium;

            &:hover {
                color: #FFF;
            }
        }
    }
}

.fullscreen-button {
    position: absolute;
    top: $spacing-small;
    right: $spacing-medium;
    cursor: pointer;

    &:hover {
        color: $color-1;
    }
}
</style>