/**
* The MIT License (MIT)
*
* Igor Zinken 2021-2026 - https://www.igorski.nl
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
    <modal class="create-document">
        <template #header>
            <h2 v-t="'newDocument'" class="component__title"></h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="save()">
                <div class="wrapper wrapper--input">
                    <label v-t="'name'"></label>
                    <input
                        ref="first"
                        v-model="name"
                        name="name"
                        class="input-field"
                    />
                </div>
                <div class="wrapper wrapper--select wrapper--small">
                    <label v-t="'documentType'"></label>
                    <select-box
                        :options="types"
                        v-model="type"
                    />
                </div>
                <div class="wrapper wrapper--select wrapper--small">
                    <label v-t="'preset'"></label>
                    <select-box
                        :options="presets"
                        v-model="preset"
                    />
                </div>
                <dimensions-formatter
                    v-model="dimensions"
                />
                <h3 v-t="'options'" class="title"></h3>
                <div class="wrapper wrapper--picker">
                    <label v-t="'backgroundColor'"></label>
                    <color-picker
                        v-model="backgroundColor"
                        v-tooltip="$t('color')"
                        color-type="HEXA"
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

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import Modal from "@/components/modal/modal.vue";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import type { DocumentType } from "@/model/types/document";
import { AllPresets, DEFAULT_DPI, DEFAULT_UNIT, DefaultPresets, type PresetValue, TimelinePresets } from "@/definitions/document-presets";
import DocumentFactory from "@/model/factories/document-factory";
import ColorPicker from "@/components/ui/color-picker/color-picker.vue";
import DimensionsFormatter from "@/components/ui/dimensions-formatter/dimensions-formatter.vue";
import { focus } from "@/utils/environment-util";
import messages from "./messages.json";

const TRANSPARENT_COLOR = "#FFFFFF00"; 

export default {
    i18n: { messages },
    components: {
        ColorPicker,
        DimensionsFormatter,
        Modal,
        SelectBox,
    },
    data: () => ({
        name : "",
        type : "default",
        preset: Object.keys( DefaultPresets )[ 0 ],
        dimensions: {
            width: 1,
            height: 1,
            dpi: DEFAULT_DPI,
            unit: DEFAULT_UNIT,
        },
        backgroundColor: TRANSPARENT_COLOR,
    }),
    computed: {
        ...mapGetters([
            "documents",
        ]),
        types(): { label: string, value: DocumentType }[] {
            return [
                { label: this.$t( "default" ), value: "default" },
                { label: this.$t( "timeline" ), value: "timeline" }
            ];
        },
        presets(): { label: string, value: PresetValue }[] {
            if ( this.type === "timeline" ) {
                return Object.keys( TimelinePresets ).map(( name: string ) => {
                    return { label: this.$t( name ), value: name };
                });
            }

            return Object.keys( DefaultPresets ).map(( name: string ) => {
                return { label: this.$t( name ), value: name };
            });
        },
    },
    watch: {
        preset: {
            immediate: true,
            handler( name: string ): void {
                const value = AllPresets[ name ];
                
                this.dimensions.dpi = value.dpi ?? DEFAULT_DPI;
                this.dimensions.width = value.width;
                this.dimensions.height = value.height;
                this.dimensions.unit = value.unit;
            },
        },
        type( type: DocumentType ): void {
            if ( type === "timeline" ) {
                this.preset = "SMALL";
            } else {
                this.preset = "DEFAULT";
            }
        },
    },
    mounted(): void {
        this.name = this.$t( "newDocumentNum", { num: this.documents.length + 1 });
        focus( this.$refs.first );
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "addNewDocument",
        ]),
        async save(): Promise<void> {
            const meta = {
                bgColor: this.backgroundColor !== TRANSPARENT_COLOR ? this.backgroundColor : undefined,
                dpi: this.dimensions.dpi,
                unit: this.dimensions.unit,
            };
            this.addNewDocument( DocumentFactory.create({
                name   : this.name,
                type   : this.type,
                width  : Math.round( this.dimensions.width ),
                height : Math.round( this.dimensions.height ),
                meta,
            }));
            this.closeModal();
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_variables";
@use "@/styles/form";
@use "@/styles/ui";

.create-document {
    @include ui.modalBase( 480px, 450px );
}

.title {
    color: #FFF;
    margin: variables.$spacing-medium 0 variables.$spacing-medium form.$labelWidth;
}

.wrapper--small .select-box-wrapper {
    width: 140px;
}
</style>
