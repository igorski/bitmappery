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
            <h2 class="component__title">{{ t( "loadSelection" ) }}</h2>
        </template>
        <template #content>
            <div class="form" @keyup.enter="requestLoad()">
                <div class="wrapper wrapper--select">
                    <label>{{ t( "availableSelections" ) }}</label>
                    <select-box
                        :options="selections"
                        v-model="name"
                    />
                </div>
            </div>
        </template>
        <template #actions>
            <button
                type="button"
                class="button"
                :disabled="!isValid"
                @click="requestLoad()"
            >{{ t( "load" ) }}</button>
            <button
                type="button"
                class="button"
                @click="closeModal()"
            >{{ t( "cancel" ) }}</button>
        </template>
    </modal>
</template>

<script lang="ts">
import { type ComposerTranslation, useI18n } from "vue-i18n";
import { mapGetters, mapMutations } from "vuex";
import ToolTypes from "@/definitions/tool-types";
import SelectBox from "@/components/ui/select-box/select-box.vue";
import { getCanvasInstance } from "@/services/canvas-service";
import { mapSelectOptions, type SelectionOption }  from "@/utils/search-select-util";
import Modal from "@/components/modal/modal.vue";

import messages from "./messages.json";
export default {
    components: {
        Modal,
        SelectBox,
    },
    data: () => ({
        name: "",
    }),
    setup(): { t: ComposerTranslation } {
        const { t } = useI18n({ messages });
        return { t };
    },
    computed: {
        ...mapGetters([
            "activeDocument",
        ]),
        selections(): SelectionOption[] {
            return mapSelectOptions( Object.keys( this.activeDocument.selections ));
        },
        isValid(): boolean {
            return this.name.length > 0;
        },
    },
    created(): void {
        this.name = this.selections[ 0 ].value;
    },
    methods: {
        ...mapMutations([
            "closeModal",
            "setActiveTool",
        ]),
        async requestLoad(): Promise<void> {
            if ( !this.isValid ) {
                return;
            }
            this.setActiveTool({ tool: ToolTypes.LASSO, document: this.activeDocument });

            // allow interaction pane to spawn (if no select mode was active yet)
            await this.$nextTick();
            getCanvasInstance()?.interactionPane.setSelection( this.activeDocument.selections[ this.name ]);

            this.closeModal();
        },
    },
};
</script>
